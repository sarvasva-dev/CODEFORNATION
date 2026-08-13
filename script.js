// ===== VSICS Hackathon Leaderboard Engine (Supabase + WebSockets + GitHub, Live & PPT Submissions) =====
const STORAGE_KEY = 'vsics_hackathon_leaderboard_v2';
const API_BASE = '/api/scores';
const ADMIN_PASSWORD = '##HELLOCODEFORNATION';
const ADMIN_AUTH_KEY = 'vsics_admin_authenticated';

console.log('🚀 [VSICS Leaderboard] Initializing Engine...');

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
  { id: 'team-15', name: 'The Dominaters' },
  { id: 'team-16', name: 'Golden Tech' }
];

const SUPABASE_URL = "https://uqgtwvbwruhwkkpvuanv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxZ3R3dmJ3cnVod2trcHZ1YW52Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQzNTc0MSwiZXhwIjoyMTAyMDExNzQxfQ.gUNRU-y98XkHGMe2S0hVFKzPCRwp-Kvy84Kf6E8R0Hw";

let supabaseClient = null;
if (window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch(e){}
}

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
    return {};
  }
}

function saveScoreMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {}
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

function saveRepoMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY + '_repos', JSON.stringify(map));
  } catch (e) {}
}

// Read live website map from LocalStorage
function getLiveMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY + '_lives');
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (e) {
    return {};
  }
}

function saveLiveMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY + '_lives', JSON.stringify(map));
  } catch (e) {}
}

// Read PPT map from LocalStorage
function getPptMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY + '_ppts');
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (e) {
    return {};
  }
}

function savePptMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY + '_ppts', JSON.stringify(map));
  } catch (e) {}
}

// Get array of teams merged with current LocalStorage scores, repos, live links & ppt links
function getTeams() {
  const map = getScoreMap();
  const repoMap = getRepoMap();
  const liveMap = getLiveMap();
  const pptMap = getPptMap();
  return HARDCODED_TEAMS.map(team => ({
    ...team,
    score: map[team.id] !== undefined ? Math.max(0, parseFloat(map[team.id]) || 0) : 0,
    repo_url: repoMap[team.id] || '',
    live_url: liveMap[team.id] || '',
    ppt_url: pptMap[team.id] || ''
  }));
}

// WebSocket Live Client Connection (Disabled on HTTPS / Vercel Serverless to prevent wss errors)
function initWebSocket(onScoresUpdate) {
  if (window.location.protocol === 'https:' || window.location.hostname.includes('vercel') || window.location.hostname.includes('now.sh')) {
    return;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:3000';
  const wsUrl = `${protocol}//${host}`;

  try {
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'SCORES_UPDATED' && Array.isArray(message.scores)) {
          const map = getScoreMap();
          const repoMap = getRepoMap();
          const liveMap = getLiveMap();
          const pptMap = getPptMap();
          message.scores.forEach(item => {
            if (item.id) {
              if (item.score !== undefined) map[item.id] = Number(item.score) || 0;
              if (item.repo_url !== undefined) repoMap[item.id] = item.repo_url || '';
              if (item.live_url !== undefined) liveMap[item.id] = item.live_url || '';
              if (item.ppt_url !== undefined) pptMap[item.id] = item.ppt_url || '';
            }
          });
          saveScoreMap(map);
          saveRepoMap(repoMap);
          saveLiveMap(liveMap);
          savePptMap(pptMap);
          if (typeof onScoresUpdate === 'function') {
            onScoresUpdate();
          }
        }
      } catch (err) {}
    };

    socket.onclose = () => { socket = null; };
    socket.onerror = () => { socket = null; };
  } catch (e) { socket = null; }
}

// Update single team score locally and sync to Supabase API
async function setTeamScore(teamId, newScore) {
  const map = getScoreMap();
  const validScore = Math.max(0, parseFloat(newScore) || 0);
  map[teamId] = validScore;
  saveScoreMap(map);

  try {
    await fetch(API_BASE, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ teamId, score: validScore, adminPassword: ADMIN_PASSWORD })
    });
  } catch (err) {}
}

// Reset all team scores to 0 locally and sync to Supabase API
async function resetAllScores() {
  const map = {};
  HARDCODED_TEAMS.forEach(t => map[t.id] = 0);
  saveScoreMap(map);

  try {
    await fetch(`${API_BASE}?action=reset`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ adminPassword: ADMIN_PASSWORD })
    });
  } catch (err) {}
}

// Sync scores, repo URLs, live URLs & PPT URLs from Supabase API to LocalStorage
async function fetchServerScores() {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) return null;
    const data = await res.json();

    if (Array.isArray(data)) {
      const map = getScoreMap();
      const repoMap = getRepoMap();
      const liveMap = getLiveMap();
      const pptMap = getPptMap();
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
          if (item.live_url !== undefined && liveMap[item.id] !== item.live_url) {
            liveMap[item.id] = item.live_url || '';
            updated = true;
          }
          if (item.ppt_url !== undefined && pptMap[item.id] !== item.ppt_url) {
            pptMap[item.id] = item.ppt_url || '';
            updated = true;
          }
        }
      });

      if (updated) {
        saveScoreMap(map);
        saveRepoMap(repoMap);
        saveLiveMap(liveMap);
        savePptMap(pptMap);
      }
      return map;
    }
  } catch (err) {}
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
  const teams = getSortedTeams().filter(t => t.score > 0);
  let csvContent = 'Rank,Team Name,Score,GitHub Repository,Live Website Demo,PPT Presentation\n';
  
  teams.forEach((t, i) => {
    const cleanName = `"${t.name.replace(/"/g, '""')}"`;
    const cleanRepo = `"${(t.repo_url || '').replace(/"/g, '""')}"`;
    const cleanLive = `"${(t.live_url || '').replace(/"/g, '""')}"`;
    const cleanPpt = `"${(t.ppt_url || '').replace(/"/g, '""')}"`;
    csvContent += `${i + 1},${cleanName},${t.score},${cleanRepo},${cleanLive},${cleanPpt}\n`;
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
}

// =========================================================
// ============  SUBMIT REPO & LIVE & PPT PAGE LOGIC  ======
// =========================================================
const repoForm = document.getElementById('repoForm');

if (repoForm) {
  console.log('📁 [Submission Portal] Submission page loaded.');
  const submitTeamSelect = document.getElementById('submitTeamSelect');
  const repoUrlInput = document.getElementById('repoUrlInput');
  const liveUrlInput = document.getElementById('liveUrlInput');
  const pptUrlInput = document.getElementById('pptUrlInput');
  const pptFileInput = document.getElementById('pptFileInput');
  const submitBtn = document.getElementById('submitBtn');
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
      const hasRepo = Boolean(team.repo_url && team.repo_url.trim());
      const hasLive = Boolean(team.live_url && team.live_url.trim());
      const hasPpt = Boolean(team.ppt_url && team.ppt_url.trim());
      if (hasRepo || hasLive || hasPpt) countSubmitted++;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#${index + 1}</strong></td>
        <td><span class="team-badge">${escapeHtml(team.name)}</span></td>
        <td>
          ${(hasRepo || hasLive || hasPpt) 
            ? '<span class="status-tag submitted">✅ Submitted</span>' 
            : '<span class="status-tag pending">⏳ Pending</span>'}
        </td>
        <td>
          ${hasRepo 
            ? `<a href="${escapeHtml(team.repo_url)}" target="_blank" rel="noopener noreferrer" class="repo-link-btn">📁 GitHub ↗</a>`
            : '<span style="color:#94A3B8; font-size:0.85rem; font-style:italic;">No repository</span>'}
        </td>
        <td>
          ${hasLive 
            ? `<a href="${escapeHtml(team.live_url)}" target="_blank" rel="noopener noreferrer" class="live-link-btn">🌐 Live Demo ↗</a>`
            : '<span style="color:#94A3B8; font-size:0.85rem; font-style:italic;">No live demo</span>'}
        </td>
        <td>
          ${hasPpt 
            ? `<a href="${escapeHtml(team.ppt_url)}" target="_blank" rel="noopener noreferrer" class="ppt-link-btn">📊 Open PPT ↗</a>`
            : '<span style="color:#94A3B8; font-size:0.85rem; font-style:italic;">No PPT</span>'}
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
    }, 5000);
  }

  repoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const teamId = submitTeamSelect.value;
    const repoUrl = repoUrlInput.value.trim();
    const liveUrl = liveUrlInput ? liveUrlInput.value.trim() : '';
    let pptUrl = pptUrlInput ? pptUrlInput.value.trim() : '';

    if (!teamId) {
      showSubmitStatus('Please select your official team from the list.', 'error');
      return;
    }

    if (!repoUrl || (!repoUrl.startsWith('http://') && !repoUrl.startsWith('https://'))) {
      showSubmitStatus('Please enter a valid GitHub repository URL (e.g. https://github.com/user/repo).', 'error');
      return;
    }

    if (liveUrl && !liveUrl.startsWith('http://') && !liveUrl.startsWith('https://')) {
      showSubmitStatus('Please enter a valid Live Website URL starting with http:// or https://', 'error');
      return;
    }

    if (pptUrl && !pptUrl.startsWith('http://') && !pptUrl.startsWith('https://')) {
      showSubmitStatus('Please enter a valid PPT URL starting with http:// or https://', 'error');
      return;
    }

    // Handle PPT File Upload (Stores directly for free in Supabase Cloud Storage)
    if (pptFileInput && pptFileInput.files && pptFileInput.files[0]) {
      const file = pptFileInput.files[0];
      if (file.size > 52428800) {
        showSubmitStatus('Uploaded PPT file size exceeds 50MB limit.', 'error');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Uploading PPT File...';
      }

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${teamId}_${Date.now()}.${fileExt}`;

        if (supabaseClient) {
          const { data: uploadData, error: uploadErr } = await supabaseClient.storage
            .from('ppts')
            .upload(fileName, file, { upsert: true });

          if (!uploadErr && uploadData) {
            const { data: publicUrlData } = supabaseClient.storage.from('ppts').getPublicUrl(fileName);
            if (publicUrlData && publicUrlData.publicUrl) {
              pptUrl = publicUrlData.publicUrl;
            }
          }
        }

        // Direct REST upload fallback if SDK not loaded
        if (!pptUrl) {
          const restUrl = `${SUPABASE_URL}/storage/v1/object/ppts/${fileName}`;
          const resUpload = await fetch(restUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'x-upsert': 'true'
            },
            body: file
          });
          if (resUpload.ok) {
            pptUrl = `${SUPABASE_URL}/storage/v1/object/public/ppts/${fileName}`;
          }
        }
      } catch (fErr) {
        console.warn('File upload exception:', fErr.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '🚀 Submit Project Details (Repo, Live Demo & PPT)';
        }
      }
    }

    // Update locally immediately
    const repoMap = getRepoMap();
    const liveMap = getLiveMap();
    const pptMap = getPptMap();
    repoMap[teamId] = repoUrl;
    if (liveUrl) liveMap[teamId] = liveUrl;
    if (pptUrl) pptMap[teamId] = pptUrl;
    saveRepoMap(repoMap);
    saveLiveMap(liveMap);
    savePptMap(pptMap);

    const submitEndpoint = '/api/scores?action=submit-repo';

    try {
      const res = await fetch(submitEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, repoUrl, liveUrl, pptUrl })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const teamName = HARDCODED_TEAMS.find(t => t.id === teamId)?.name || 'Team';
        showSubmitStatus(`🎉 Project Details & Presentation for "${teamName}" submitted successfully!`, 'success');
        repoUrlInput.value = '';
        if (liveUrlInput) liveUrlInput.value = '';
        if (pptUrlInput) pptUrlInput.value = '';
        if (pptFileInput) pptFileInput.value = '';
        submitTeamSelect.value = '';
        renderRepoRosterUI();
      } else {
        showSubmitStatus(data.error || 'Failed to submit details. Please try again.', 'error');
      }
    } catch (err) {
      showSubmitStatus('Submitted locally! Will sync when connection restores.', 'success');
      renderRepoRosterUI();
    }
  });

  if (whatsappShareBtn) {
    whatsappShareBtn.addEventListener('click', () => {
      const shareUrl = window.location.href;
      const shareText = `🚩 *CODE FOR THE NATION 2026*\n\nAttention Team Leaders: Please select your team and submit your official GitHub Repository, Live Hosted Website & PPT Presentation links here:\n\n🔗 ${shareUrl}`;
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

  setInterval(async () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      const updatedMap = await fetchServerScores();
      if (updatedMap) renderRepoRosterUI();
    }
  }, 4000);

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === STORAGE_KEY + '_repos' || e.key === STORAGE_KEY + '_lives' || e.key === STORAGE_KEY + '_ppts') {
      renderRepoRosterUI();
    }
  });
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

  const adminUserSelect = document.getElementById('adminUserSelect');
  const loggedAdminBadge = document.getElementById('loggedAdminBadge');
  const loggedAdminName = document.getElementById('loggedAdminName');
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
    const savedName = sessionStorage.getItem('vsics_admin_name');

    if (isAuthed) {
      if (adminLoginModal) adminLoginModal.style.display = 'none';
      if (adminMainContent) adminMainContent.style.display = 'block';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (loggedAdminBadge) {
        loggedAdminBadge.style.display = 'inline-flex';
        if (loggedAdminName) loggedAdminName.textContent = savedName || 'Evaluator';
      }
      populateDropdown();
      renderEntriesUI();
      fetchServerScores().then(map => {
        if (map) renderEntriesUI();
      });
    } else {
      if (adminLoginModal) adminLoginModal.style.display = 'flex';
      if (adminMainContent) adminMainContent.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (loggedAdminBadge) loggedAdminBadge.style.display = 'none';
      if (adminUserSelect) adminUserSelect.focus();
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
      const selectedEvaluator = adminUserSelect ? adminUserSelect.value : '';
      const enteredPass = adminPassInput.value.trim();

      if (!selectedEvaluator) {
        loginStatus.textContent = '⚠️ Please select an official Evaluator / Admin name.';
        loginStatus.className = 'login-status error';
        return;
      }

      if (enteredPass === ADMIN_PASSWORD) {
        sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
        sessionStorage.setItem('vsics_admin_name', selectedEvaluator);
        loginStatus.textContent = `✅ Welcome ${selectedEvaluator}! Access Granted...`;
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
        sessionStorage.removeItem('vsics_admin_name');
        checkAdminAuth();
      }
    });
  }

  function populateDropdown() {
    teamSelect.innerHTML = '<option value="" disabled selected>-- Select Official Team --</option>';
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
          <div class="team-name-cell" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <span class="team-badge">${escapeHtml(team.name)}</span>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              ${team.repo_url ? `<a href="${escapeHtml(team.repo_url)}" target="_blank" rel="noopener noreferrer" class="repo-link-btn">📁 GitHub ↗</a>` : ''}
              ${team.live_url ? `<a href="${escapeHtml(team.live_url)}" target="_blank" rel="noopener noreferrer" class="live-link-btn">🌐 Live Demo ↗</a>` : ''}
              ${team.ppt_url ? `<a href="${escapeHtml(team.ppt_url)}" target="_blank" rel="noopener noreferrer" class="ppt-link-btn">📊 Open PPT ↗</a>` : ''}
            </div>
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

  checkAdminAuth();
  initWebSocket(() => renderEntriesUI());

  setInterval(async () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      const updatedMap = await fetchServerScores();
      if (updatedMap) renderEntriesUI();
    }
  }, 4000);

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === STORAGE_KEY + '_repos' || e.key === STORAGE_KEY + '_lives' || e.key === STORAGE_KEY + '_ppts') {
      renderEntriesUI();
    }
  });
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
            <div style="margin-top: 10px; display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
              ${item.data.repo_url ? `<a href="${escapeHtml(item.data.repo_url)}" target="_blank" rel="noopener noreferrer" class="repo-link-btn">📁 GitHub ↗</a>` : ''}
              ${item.data.live_url ? `<a href="${escapeHtml(item.data.live_url)}" target="_blank" rel="noopener noreferrer" class="live-link-btn">🌐 Live Demo ↗</a>` : ''}
              ${item.data.ppt_url ? `<a href="${escapeHtml(item.data.ppt_url)}" target="_blank" rel="noopener noreferrer" class="ppt-link-btn">📊 Open PPT ↗</a>` : ''}
            </div>
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
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              ${team.repo_url ? `<a href="${escapeHtml(team.repo_url)}" target="_blank" rel="noopener noreferrer" class="repo-link-btn">📁 GitHub ↗</a>` : ''}
              ${team.live_url ? `<a href="${escapeHtml(team.live_url)}" target="_blank" rel="noopener noreferrer" class="live-link-btn">🌐 Live Demo ↗</a>` : ''}
              ${team.ppt_url ? `<a href="${escapeHtml(team.ppt_url)}" target="_blank" rel="noopener noreferrer" class="ppt-link-btn">📊 Open PPT ↗</a>` : ''}
            </div>
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

  renderLeaderboardUI();

  fetchServerScores().then(map => {
    if (map) renderLeaderboardUI();
  });

  initWebSocket(() => renderLeaderboardUI());

  setInterval(async () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      const updatedMap = await fetchServerScores();
      renderLeaderboardUI();
    }
  }, 3000);

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === STORAGE_KEY + '_repos' || e.key === STORAGE_KEY + '_lives' || e.key === STORAGE_KEY + '_ppts') {
      renderLeaderboardUI();
    }
  });
}
