// ===== Shared Config & Hardcoded Roster =====
const STORAGE_KEY = 'vsics_hackathon_leaderboard';
const API_BASE = '/api/scores';

console.log('🚀 [VSICS Leaderboard] Initializing script.js...');

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

// Helper to load scores from localStorage
function getLocalScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (e) {
    console.error('⚠️ [LocalStorage] Error parsing stored scores:', e);
    return {};
  }
}

function saveLocalScore(teamId, score) {
  const map = getLocalScores();
  map[teamId] = Math.max(0, parseFloat(score) || 0);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  console.log(`💾 [LocalStorage] Saved team score: ${teamId} = ${map[teamId]}`);
}

function saveLocalReset() {
  const map = {};
  HARDCODED_TEAMS.forEach(t => map[t.id] = 0);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  console.log('🧹 [LocalStorage] Reset all team scores to 0');
}

// In-memory state initialized immediately from localStorage
let currentTeamsState = HARDCODED_TEAMS.map(team => {
  const localMap = getLocalScores();
  return {
    ...team,
    score: localMap[team.id] !== undefined ? Math.max(0, parseFloat(localMap[team.id]) || 0) : 0
  };
});

console.log('📊 [State] Loaded initial teams state:', currentTeamsState);

// Fetch scores from API and merge smartly without wiping local edits
async function syncScoresWithAPI() {
  console.log('🔄 [API Sync] Requesting latest scores from server...');
  try {
    const res = await fetch(API_BASE);
    if (res.ok) {
      const serverData = await res.json();
      console.log('📥 [API Sync] Server response received:', serverData);
      if (Array.isArray(serverData) && serverData.length > 0) {
        const localMap = getLocalScores();
        const updatedMap = {};

        currentTeamsState = HARDCODED_TEAMS.map(team => {
          const serverTeam = serverData.find(s => s.id === team.id);
          const serverScore = serverTeam ? (parseFloat(serverTeam.score) || 0) : 0;
          const localScore = localMap[team.id] !== undefined ? (parseFloat(localMap[team.id]) || 0) : 0;

          // Smart merge: keep higher score between local & server unless reset
          const finalScore = Math.max(serverScore, localScore);
          updatedMap[team.id] = finalScore;
          return { ...team, score: finalScore };
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMap));
        console.log('✅ [API Sync] Scores synchronized successfully.');
      }
    } else {
      console.warn(`⚠️ [API Sync] Server responded with status: ${res.status}`);
    }
  } catch (e) {
    console.warn('⚡ [API Sync] Deferred to local storage fallback:', e.message);
  }
}

async function updateTeamScore(teamId, newScore) {
  const scoreVal = Math.max(0, parseFloat(newScore) || 0);
  saveLocalScore(teamId, scoreVal);

  // Update in-memory state instantly
  const team = currentTeamsState.find(t => t.id === teamId);
  if (team) {
    team.score = scoreVal;
    console.log(`🎯 [UI Action] Updated "${team.name}" (${teamId}) -> Score: ${scoreVal}`);
  }

  // Background API Push
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, score: scoreVal })
    });
    if (res.ok) {
      console.log(`🌐 [API Push] Successfully updated score on server for ${teamId}`);
    }
  } catch (e) {
    console.warn('⚠️ [API Push] Deferred to local storage fallback:', e.message);
  }
}

async function resetAllTeamScores() {
  console.log('🚨 [Action] Resetting all team scores...');
  saveLocalReset();
  currentTeamsState.forEach(t => t.score = 0);

  try {
    await fetch(`${API_BASE}/reset`, { method: 'POST' });
    console.log('🌐 [API Reset] Reset confirmed on server.');
  } catch (e) {
    console.warn('⚠️ [API Reset] Deferred to local storage fallback:', e.message);
  }
}

function sortedTeams() {
  return [...currentTeamsState].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Export Leaderboard Data to CSV
function exportLeaderboardCSV() {
  console.log('📥 [CSV Export] Generating leaderboard CSV file...');
  const teams = sortedTeams();
  let csvContent = 'Rank,Team Name,Score\n';
  
  teams.forEach((t, i) => {
    const cleanName = `"${t.name.replace(/"/g, '""')}"`;
    csvContent += `${i + 1},${cleanName},${t.score}\n`;
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
  console.log('✅ [CSV Export] File download initiated.');
}

// =========================================================
// ============  INDEX (SCORE CONTROL) PAGE LOGIC  =========
// =========================================================
const scoreForm = document.getElementById('scoreForm');

if (scoreForm) {
  console.log('🛠️ [Page] Score Control Panel detected.');
  const teamSelect = document.getElementById('teamSelect');
  const teamScoreInput = document.getElementById('teamScore');
  const statusMsg = document.getElementById('statusMsg');
  const entriesBody = document.getElementById('entriesBody');
  const entryCount = document.getElementById('entryCount');
  const resetAllBtn = document.getElementById('resetAllBtn');

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
    console.log('🎨 [Render] Rendering Control Panel entries table...');
    entryCount.textContent = currentTeamsState.length;
    entriesBody.innerHTML = '';

    currentTeamsState.forEach((team, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#${index + 1}</strong></td>
        <td><span class="team-badge">${escapeHtml(team.name)}</span></td>
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
    const team = currentTeamsState.find(t => t.id === teamId);
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

    await updateTeamScore(teamId, score);
    const teamName = HARDCODED_TEAMS.find(t => t.id === teamId)?.name || 'Team';
    showStatus(`Score for "${teamName}" updated to ${score}.`, 'success');
    renderEntriesUI();
  });

  entriesBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const teamId = btn.getAttribute('data-id');
    if (!teamId) return;

    const team = currentTeamsState.find(t => t.id === teamId);
    if (!team) return;

    if (btn.classList.contains('quick-btn')) {
      const delta = parseFloat(btn.getAttribute('data-delta')) || 0;
      const newScore = Math.max(0, team.score + delta);
      await updateTeamScore(teamId, newScore);
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
        await updateTeamScore(teamId, newScore);
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
      const team = currentTeamsState.find(t => t.id === teamId);
      if (team && !isNaN(newScore) && newScore >= 0) {
        await updateTeamScore(teamId, newScore);
        showStatus(`"${team.name}" updated to ${newScore}.`, 'success');
        renderEntriesUI();
      }
    }
  });

  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset ALL team scores to 0?')) {
        await resetAllTeamScores();
        renderEntriesUI();
        teamScoreInput.value = '';
        teamSelect.value = '';
        showStatus('All team scores reset to 0.', 'success');
      }
    });
  }

  populateDropdown();
  renderEntriesUI();

  // Background API Sync
  syncScoresWithAPI().then(renderEntriesUI);
}

// =========================================================
// ============  LEADERBOARD (DISPLAY) PAGE LOGIC  ==========
// =========================================================
const leaderboardBody = document.getElementById('leaderboardBody');

if (leaderboardBody) {
  console.log('🏆 [Page] Live Leaderboard page detected.');
  const podium = document.getElementById('podium');
  const emptyMsg = document.getElementById('emptyMsg');
  const exportBtn = document.getElementById('exportBtn');
  const searchInput = document.getElementById('searchInput');

  const medals = ['🥇', '🥈', '🥉'];
  const rankClasses = ['gold', 'silver', 'bronze'];

  function renderLeaderboardUI() {
    console.log('🏆 [Render] Rendering Live Leaderboard UI...');
    const allTeams = sortedTeams();
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const filteredTeams = query
      ? allTeams.filter(t => t.name.toLowerCase().includes(query))
      : allTeams;

    leaderboardBody.innerHTML = '';
    if (podium) podium.innerHTML = '';

    if (allTeams.length === 0) {
      if (emptyMsg) emptyMsg.style.display = 'block';
      return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';

    // Podium (top 3)
    if (podium && !query) {
      const top3 = allTeams.slice(0, 3);
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
          `;
          podium.appendChild(div);
        }
      });
    }

    // Full Rankings Table
    filteredTeams.forEach((team) => {
      const overallRank = allTeams.findIndex(t => t.id === team.id) + 1;
      const tr = document.createElement('tr');
      const rankClass = rankClasses[overallRank - 1] || '';
      
      tr.innerHTML = `
        <td class="rank-cell ${rankClass}">
          ${overallRank <= 3 ? medals[overallRank - 1] : ''} #${overallRank}
        </td>
        <td>
          <div class="team-name-cell">
            <strong>${escapeHtml(team.name)}</strong>
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

  // Render instantly from local state
  renderLeaderboardUI();

  // Background API Sync & Periodic Refresh
  syncScoresWithAPI().then(renderLeaderboardUI);
  setInterval(async () => {
    await syncScoresWithAPI();
    renderLeaderboardUI();
  }, 3000);

  // Storage listener for cross-tab sync
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      console.log('🔄 [Storage Event] Detected changes in another tab, updating UI...');
      const localMap = getLocalScores();
      currentTeamsState.forEach(t => {
        if (localMap[t.id] !== undefined) t.score = parseFloat(localMap[t.id]) || 0;
      });
      renderLeaderboardUI();
    }
  });
}
