// ===== VSICS Hackathon Leaderboard Engine (Supabase + WebSockets + GitHub Repo Submissions) =====
const STORAGE_KEY = 'vsics_hackathon_leaderboard_v2';
const API_BASE = '/api/scores';
const ADMIN_PASSWORD = '##HELLOCODEFORNATION';
const ADMIN_AUTH_KEY = 'vsics_admin_authenticated';

console.log('🚀 [VSICS Leaderboard] Initializing Supabase + WebSocket Engine...');

const HARDCODED_TEAMS = [
  { id: 'team-1', name: 'Built4Bharat' },
  { id: 'team-2', name: 'IND-Squad' },
  { id: 'team-3', name: 'Nation Builders' },
  { id: 'team-4', name: 'Brain Wave' },
  { id: 'team-5', name: 'NextGen India' },
  { id: 'team-6', name: 'Tech BBG' },
  { id: 'team-7', name: 'Web Warriors' },
  { id: 'team-8', name: 'Babamosie' },
  { id: 'team-9', name: 'Future Thinkers' },
  { id: 'team-10', name: 'BRX Devs' },
  { id: 'team-11', name: 'Code Crafters' },
  { id: 'team-12', name: 'ByteNations' },
  { id: 'team-13', name: 'Mind Matrix' },
  { id: 'team-14', name: 'Flexbox Fanatics' },
  { id: 'team-15', name: 'The Dominaters' }
];

let socket = null;
let reconnectTimer = null;

function getAdminHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-admin-password': ADMIN_PASSWORD
  };
}

// Read score map from LocalStorage
function getScoreMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (e) {
    console.error('⚠️ [LocalStorage] Error reading store:', e);
    return {};
  }
}

// Write score map to LocalStorage
function saveScoreMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('⚠️ [LocalStorage] Error saving store:', e);
  }
}

// Read repo map from LocalStorage
function getRepoMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY + '_repos');
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (e) {
    return {};
  }
}

// Write repo map to LocalStorage
function saveRepoMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY + '_repos', JSON.stringify(map));
  } catch (e) {}
}

// Get array of teams merged with current LocalStorage scores and repos
function getTeams() {
  const map = getScoreMap();
  const repoMap = getRepoMap();
  return HARDCODED_TEAMS.map(team => ({
    ...team,
    score: map[team.id] !== undefined ? Math.max(0, parseFloat(map[team.id]) || 0) : 0,
    repo_url: repoMap[team.id] || ''
  }));
}

// WebSocket Live Client Connection with Auto-reconnect
function initWebSocket(onScoresUpdate) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:3000';
  const wsUrl = `${protocol}//${host}`;

  try {
    console.log(`🔌 [WebSocket Client] Connecting to ${wsUrl}...`);
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('⚡ [WebSocket Client] Realtime connection established.');
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'SCORES_UPDATED' && Array.isArray(message.scores)) {
          console.log('📡 [WebSocket Broadcast] Instant score/repo update received!');
          const map = getScoreMap();
          const repoMap = getRepoMap();
          message.scores.forEach(item => {
            if (item.id) {
              if (item.score !== undefined) map[item.id] = Number(item.score) || 0;
              if (item.repo_url !== undefined) repoMap[item.id] = item.repo_url || '';
            }
          });
          saveScoreMap(map);
          saveRepoMap(repoMap);
          if (typeof onScoresUpdate === 'function') {
            onScoresUpdate();
          }
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    socket.onclose = () => {
      console.warn('⚠️ [WebSocket Client] Disconnected. Retrying in 3 seconds...');
      reconnectTimer = setTimeout(() => initWebSocket(onScoresUpdate), 3000);
    };

    socket.onerror = (err) => {
      console.warn('⚠️ [WebSocket Client] Connection error:', err);
    };
  } catch (e) {
    console.warn('WebSocket connection failed/unsupported:', e.message);
  }
}

// Update single team score locally and sync to Supabase API
async function setTeamScore(teamId, newScore) {
  const map = getScoreMap();
  const validScore = Math.max(0, parseFloat(newScore) || 0);
  map[teamId] = validScore;
  saveScoreMap(map);
  console.log(`💾 [LocalStorage] Updated "${teamId}" -> ${validScore} pts`);

  // Sync with Supabase API
  try {
    await fetch(API_BASE, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ teamId, score: validScore, adminPassword: ADMIN_PASSWORD })
    });
    console.log(`⚡ [Supabase API] Saved score for ${teamId}`);
  } catch (err) {
    console.warn('⚠️ [Supabase API] Network push failed, cached locally:', err.message);
  }
}

// Reset all team scores to 0 locally and sync to Supabase API
async function resetAllScores() {
  const map = {};
  HARDCODED_TEAMS.forEach(t => map[t.id] = 0);
  saveScoreMap(map);
  console.log('🧹 [LocalStorage] All team scores reset to 0.');

  try {
    await fetch(`${API_BASE}?action=reset`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ adminPassword: ADMIN_PASSWORD })
    });
    console.log('⚡ [Supabase API] Reset all scores on database.');
  } catch (err) {
    console.warn('⚠️ [Supabase API] Network reset failed:', err.message);
  }
}

// Sync scores & repo URLs from Supabase API to LocalStorage
async function fetchServerScores() {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) return null;
    const data = await res.json();

    if (Array.isArray(data)) {
      const map = getScoreMap();
      const repoMap = getRepoMap();
      let updated = false;
      data.forEach(item => {
        if (item.id) {
          if (item.score !== undefined && map[item.id] !== item.score) {
            map[item.id] = Number(item.score) || 0;
            updated = true;
          }
          if (item.repo_url !== undefined && repoMap[item.id] !== item.repo_url) {
            repoMap[item.id] = item.repo_url || '';
            updated = true;
          }
        }
      });

      if (updated) {
        saveScoreMap(map);
        saveRepoMap(repoMap);
        console.log('🔄 [Supabase API] Local state updated from server.');
      }
      return map;
    }
  } catch (err) {
    // Offline or server not running - local store used silently
  }
  return null;
}

// Return teams sorted by score descending
function getSortedTeams() {
  return getTeams().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Export Leaderboard Data to CSV
function exportLeaderboardCSV() {
  console.log('📥 [CSV Export] Generating CSV file...');
  const teams = getSortedTeams().filter(t => t.score > 0);
  let csvContent = 'Rank,Team Name,Score,GitHub Repository\n';
  
  teams.forEach((t, i) => {
    const cleanName = `"${t.name.replace(/"/g, '""')}"`;
    const cleanRepo = `"${(t.repo_url || '').replace(/"/g, '""')}"`;
    csvContent += `${i + 1},${cleanName},${t.score},${cleanRepo}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Code_for_the_Nation_Leaderboard_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.log('✅ [CSV Export] Download started.');
}

// =========================================================
// ============  SUBMIT REPO PAGE LOGIC  ===================
// =========================================================
const repoForm = document.getElementById('repoForm');

if (repoForm) {
  console.log('📁 [Submission Portal] GitHub Repo Submission page loaded.');
  const submitTeamSelect = document.getElementById('submitTeamSelect');
  const repoUrlInput = document.getElementById('repoUrlInput');
  const submitStatusMsg = document.getElementById('submitStatusMsg');
  const repoRosterBody = document.getElementById('repoRosterBody');
  const submittedCount = document.getElementById('submittedCount');
  const whatsappShareBtn = document.getElementById('whatsappShareBtn');

  function populateSubmitDropdown() {
    submitTeamSelect.innerHTML = '<option value="" disabled selected>-- Select Your Official Team --</option>';
    HARDCODED_TEAMS.forEach(team => {
      const opt = document.createElement('option');
      opt.value = team.id;
      opt.textContent = team.name;
      submitTeamSelect.appendChild(opt);
    });
  }

  function renderRepoRosterUI() {
    const teams = getTeams();
    let countSubmitted = 0;
    repoRosterBody.innerHTML = '';

    teams.forEach((team, index) => {
      const isSubmitted = Boolean(team.repo_url && team.repo_url.trim());
      if (isSubmitted) countSubmitted++;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#${index + 1}</strong></td>
        <td><span class="team-badge">${escapeHtml(team.name)}</span></td>
        <td>
          ${isSubmitted 
            ? '<span class="status-tag submitted">✅ Submitted</span>' 
            : '<span class="status-tag pending">⏳ Pending</span>'}
        </td>
        <td>
          ${isSubmitted 
            ? `<a href="${escapeHtml(team.repo_url)}" target="_blank" rel="noopener noreferrer" class="repo-link-btn">📁 ${escapeHtml(team.repo_url)} ↗</a>`
            : '<span style="color:#94A3B8; font-size:0.85rem; font-style:italic;">No repository submitted yet</span>'}
        </td>
      `;
      repoRosterBody.appendChild(tr);
    });

    if (submittedCount) submittedCount.textContent = countSubmitted;
  }

  function showSubmitStatus(message, type) {
    submitStatusMsg.textContent = message;
    submitStatusMsg.className = 'status-msg ' + type;
    setTimeout(() => {
      submitStatusMsg.textContent = '';
      submitStatusMsg.className = 'status-msg';
    }, 4000);
  }

  repoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const teamId = submitTeamSelect.value;
    const repoUrl = repoUrlInput.value.trim();

    if (!teamId) {
      showSubmitStatus('Please select your official team from the list.', 'error');
      return;
    }

    if (!repoUrl || (!repoUrl.startsWith('http://') && !repoUrl.startsWith('https://'))) {
      showSubmitStatus('Please enter a valid GitHub repository URL (e.g. https://github.com/user/repo).', 'error');
      return;
    }

    // Update locally immediately
    const repoMap = getRepoMap();
    repoMap[teamId] = repoUrl;
    saveRepoMap(repoMap);

    try {
      const res = await fetch('/api/submit-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, repoUrl })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const teamName = HARDCODED_TEAMS.find(t => t.id === teamId)?.name || 'Team';
        showSubmitStatus(`🎉 GitHub Repository link for "${teamName}" submitted successfully!`, 'success');
        repoUrlInput.value = '';
        submitTeamSelect.value = '';
        renderRepoRosterUI();
      } else {
        showSubmitStatus(data.error || 'Failed to submit repository URL. Please try again.', 'error');
      }
    } catch (err) {
      showSubmitStatus('Submitted locally! Will sync when connection restores.', 'success');
      renderRepoRosterUI();
    }
  });

  if (whatsappShareBtn) {
    whatsappShareBtn.addEventListener('click', () => {
      const shareUrl = window.location.href;
      const shareText = `🚩 *CODE FOR THE NATION 2026*\n\nAttention Team Leaders: Please select your team and submit your official GitHub Project Repository link here:\n\n🔗 ${shareUrl}`;
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, '_blank');
    });
  }

  populateSubmitDropdown();
  renderRepoRosterUI();
  fetchServerScores().then(map => {
    if (map) renderRepoRosterUI();
  });
  initWebSocket(() => renderRepoRosterUI());
}

// =========================================================
// ============  INDEX (SCORE CONTROL) PAGE LOGIC  =========
// =========================================================
const scoreForm = document.getElementById('scoreForm');

if (scoreForm) {
  console.log('🛠️ [Control Panel] Score Control Panel loaded.');
  const teamSelect = document.getElementById('teamSelect');
  const teamScoreInput = document.getElementById('teamScore');
  const statusMsg = document.getElementById('statusMsg');
  const entriesBody = document.getElementById('entriesBody');
  const entryCount = document.getElementById('entryCount');
  const resetAllBtn = document.getElementById('resetAllBtn');

  const adminLoginModal = document.getElementById('adminLoginModal');
  const adminMainContent = document.getElementById('adminMainContent');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminPassInput = document.getElementById('adminPassInput');
  const loginStatus = document.getElementById('loginStatus');
  const loginCard = document.getElementById('loginCard');
  const logoutBtn = document.getElementById('logoutBtn');
  const togglePassBtn = document.getElementById('togglePassBtn');

  function checkAdminAuth() {
    const isAuthed = sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
    if (isAuthed) {
      if (adminLoginModal) adminLoginModal.style.display = 'none';
      if (adminMainContent) adminMainContent.style.display = 'block';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      populateDropdown();
      renderEntriesUI();
      fetchServerScores().then(map => {
        if (map) renderEntriesUI();
      });
    } else {
      if (adminLoginModal) adminLoginModal.style.display = 'flex';
      if (adminMainContent) adminMainContent.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (adminPassInput) adminPassInput.focus();
    }
  }

  if (togglePassBtn && adminPassInput) {
    togglePassBtn.addEventListener('click', () => {
      if (adminPassInput.type === 'password') {
        adminPassInput.type = 'text';
        togglePassBtn.textContent = '🙈';
      } else {
        adminPassInput.type = 'password';
        togglePassBtn.textContent = '👁️';
      }
    });
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredPass = adminPassInput.value.trim();
      if (enteredPass === ADMIN_PASSWORD) {
        sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
        loginStatus.textContent = '✅ Access Granted! Unlocking...';
        loginStatus.className = 'login-status success';
        setTimeout(() => {
          adminPassInput.value = '';
          loginStatus.textContent = '';
          checkAdminAuth();
        }, 500);
      } else {
        loginStatus.textContent = '❌ Incorrect Admin Password! Access Denied.';
        loginStatus.className = 'login-status error';
        if (loginCard) {
          loginCard.classList.remove('shake');
          void loginCard.offsetWidth;
          loginCard.classList.add('shake');
        }
        adminPassInput.value = '';
        adminPassInput.focus();
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to log out of Admin Control Panel?')) {
        sessionStorage.removeItem(ADMIN_AUTH_KEY);
        checkAdminAuth();
      }
    });
  }

  function populateDropdown() {
    teamSelect.innerHTML = '<option value="" disabled selected>-- Select Hardcoded Team --</option>';
    HARDCODED_TEAMS.forEach(team => {
      const opt = document.createElement('option');
      opt.value = team.id;
      opt.textContent = team.name;
      teamSelect.appendChild(opt);
    });
  }

  function renderEntriesUI() {
    const teams = getTeams();
    entryCount.textContent = teams.length;
    entriesBody.innerHTML = '';

    teams.forEach((team, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#${index + 1}</strong></td>
        <td>
          <div class="team-name-cell" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span class="team-badge">${escapeHtml(team.name)}</span>
            ${team.repo_url ? `<a href="${escapeHtml(team.repo_url)}" target="_blank" rel="noopener noreferrer" class="repo-link-btn">📁 GitHub ↗</a>` : ''}
          </div>
        </td>
        <td>
          <div class="score-input-wrap">
            <input type="number" class="table-score-input" data-id="${team.id}" value="${team.score}" min="0" max="10000" step="1">
          </div>
        </td>
        <td>
          <div class="quick-btns">
            <button type="button" class="quick-btn plus-btn" data-id="${team.id}" data-delta="1">+1</button>
            <button type="button" class="quick-btn plus-btn" data-id="${team.id}" data-delta="5">+5</button>
            <button type="button" class="quick-btn plus-btn" data-id="${team.id}" data-delta="10">+10</button>
            <button type="button" class="quick-btn minus-btn" data-id="${team.id}" data-delta="-1">-1</button>
            <button type="button" class="btn-save" data-id="${team.id}">Save</button>
          </div>
        </td>
      `;
      entriesBody.appendChild(tr);
    });
  }

  function showStatus(message, type) {
    statusMsg.textContent = message;
    statusMsg.className = 'status-msg ' + type;
    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
    }, 2500);
  }

  teamSelect.addEventListener('change', () => {
    const teamId = teamSelect.value;
    const team = getTeams().find(t => t.id === teamId);
    if (team) {
      teamScoreInput.value = team.score;
      teamScoreInput.focus();
    }
  });

  scoreForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const teamId = teamSelect.value;
    const score = parseFloat(teamScoreInput.value);

    if (!teamId) {
      showStatus('Please select a team from the list.', 'error');
      return;
    }

    if (isNaN(score) || score < 0) {
      showStatus('Please enter a valid score (0 or greater).', 'error');
      return;
    }

    await setTeamScore(teamId, score);
    const teamName = HARDCODED_TEAMS.find(t => t.id === teamId)?.name || 'Team';
    showStatus(`Score for "${teamName}" set to ${score}.`, 'success');
    renderEntriesUI();
  });

  entriesBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const teamId = btn.getAttribute('data-id');
    if (!teamId) return;

    const team = getTeams().find(t => t.id === teamId);
    if (!team) return;

    if (btn.classList.contains('quick-btn')) {
      const delta = parseFloat(btn.getAttribute('data-delta')) || 0;
      const newScore = Math.max(0, team.score + delta);
      await setTeamScore(teamId, newScore);
      showStatus(`"${team.name}" score updated to ${newScore}`, 'success');
      renderEntriesUI();
      if (teamSelect.value === teamId) {
        teamScoreInput.value = newScore;
      }
    } else if (btn.classList.contains('btn-save')) {
      const row = btn.closest('tr');
      const input = row.querySelector('.table-score-input');
      const newScore = parseFloat(input.value);
      if (!isNaN(newScore) && newScore >= 0) {
        await setTeamScore(teamId, newScore);
        showStatus(`"${team.name}" updated to ${newScore}.`, 'success');
        renderEntriesUI();
      } else {
        showStatus('Invalid score value.', 'error');
      }
    }
  });

  entriesBody.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('table-score-input')) {
      const teamId = e.target.getAttribute('data-id');
      const newScore = parseFloat(e.target.value);
      const team = getTeams().find(t => t.id === teamId);
      if (team && !isNaN(newScore) && newScore >= 0) {
        await setTeamScore(teamId, newScore);
        showStatus(`"${team.name}" updated to ${newScore}.`, 'success');
        renderEntriesUI();
      }
    }
  });

  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset ALL team scores to 0?')) {
        await resetAllScores();
        renderEntriesUI();
        teamScoreInput.value = '';
        teamSelect.value = '';
        showStatus('All team scores reset to 0.', 'success');
      }
    });
  }

  // Initialize Admin Authentication Check & WebSocket
  checkAdminAuth();
  initWebSocket(() => renderEntriesUI());
}

// =========================================================
// ============  LEADERBOARD (PUBLIC DISPLAY) PAGE LOGIC  ===
// =========================================================
const leaderboardBody = document.getElementById('leaderboardBody');

if (leaderboardBody) {
  console.log('🏆 [Leaderboard] Public Live Leaderboard loaded (No Password Required).');
  const podium = document.getElementById('podium');
  const emptyMsg = document.getElementById('emptyMsg');
  const exportBtn = document.getElementById('exportBtn');
  const searchInput = document.getElementById('searchInput');

  const medals = ['🥇', '🥈', '🥉'];
  const rankClasses = ['gold', 'silver', 'bronze'];

  function renderLeaderboardUI() {
    // Only display teams that have been assigned a score (> 0)
    const activeTeams = getSortedTeams().filter(t => t.score > 0);
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const filteredTeams = query
      ? activeTeams.filter(t => t.name.toLowerCase().includes(query))
      : activeTeams;

    leaderboardBody.innerHTML = '';
    if (podium) podium.innerHTML = '';

    if (activeTeams.length === 0) {
      if (emptyMsg) emptyMsg.style.display = 'block';
      return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';

    // Podium (top 3 with score > 0)
    if (podium && !query) {
      const top3 = activeTeams.slice(0, 3);
      const podiumOrder = [
        { rank: 2, data: top3[1] },
        { rank: 1, data: top3[0] },
        { rank: 3, data: top3[2] }
      ];

      podiumOrder.forEach(item => {
        if (item.data) {
          const div = document.createElement('div');
          div.className = `podium-item rank-${item.rank}`;
          div.innerHTML = `
            <div class="podium-badge">RANK ${item.rank}</div>
            <div class="podium-medal">${medals[item.rank - 1]}</div>
            <div class="podium-name">${escapeHtml(item.data.name)}</div>
            <div class="podium-score">${item.data.score} <span class="pts-unit">pts</span></div>
            ${item.data.repo_url ? `<div style="margin-top: 8px;"><a href="${escapeHtml(item.data.repo_url)}" target="_blank" rel="noopener noreferrer" class="repo-link-btn">📁 GitHub Repo ↗</a></div>` : ''}
          `;
          podium.appendChild(div);
        }
      });
    }

    // Full Rankings Table (only teams with score > 0)
    filteredTeams.forEach((team) => {
      const overallRank = activeTeams.findIndex(t => t.id === team.id) + 1;
      const tr = document.createElement('tr');
      const rankClass = rankClasses[overallRank - 1] || '';
      
      tr.innerHTML = `
        <td class="rank-cell ${rankClass}">
          ${overallRank <= 3 ? medals[overallRank - 1] : ''} #${overallRank}
        </td>
        <td>
          <div class="team-name-cell" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <strong>${escapeHtml(team.name)}</strong>
            ${team.repo_url ? `<a href="${escapeHtml(team.repo_url)}" target="_blank" rel="noopener noreferrer" class="repo-link-btn">📁 GitHub Repo ↗</a>` : ''}
          </div>
        </td>
        <td>
          <span class="score-display">${team.score} <span class="pts">PTS</span></span>
        </td>
      `;
      leaderboardBody.appendChild(tr);
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportLeaderboardCSV);
  }

  if (searchInput) {
    searchInput.addEventListener('input', renderLeaderboardUI);
  }

  // Initial render
  renderLeaderboardUI();

  // Initial server sync
  fetchServerScores().then(map => {
    if (map) renderLeaderboardUI();
  });

  // Initialize Ultra-Fast Real-Time WebSocket Connection
  initWebSocket(() => renderLeaderboardUI());

  // Polling backup fallback every 5 seconds if WebSocket drops
  setInterval(async () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      const updatedMap = await fetchServerScores();
      renderLeaderboardUI();
    }
  }, 5000);

  // Storage listener for instant cross-tab sync
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === STORAGE_KEY + '_repos') {
      console.log('🔄 [Storage Event] Realtime sync from another tab.');
      renderLeaderboardUI();
    }
  });
}
