// ===== Shared Config & Hardcoded Roster =====
const STORAGE_KEY = 'vsics_hackathon_leaderboard';
const API_BASE = '/api/scores';

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

// Memory state for instant UI rendering
let currentTeamsState = HARDCODED_TEAMS.map(t => ({ ...t, score: 0 }));

// Get local backup scores
function getLocalScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (e) {
    return {};
  }
}

function saveLocalScore(teamId, score) {
  const map = getLocalScores();
  map[teamId] = Math.max(0, parseFloat(score) || 0);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function saveLocalReset() {
  const map = {};
  HARDCODED_TEAMS.forEach(t => map[t.id] = 0);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// Fetch scores from MongoDB API (with localStorage fallback)
async function fetchTeams() {
  try {
    const res = await fetch(API_BASE);
    if (res.ok) {
      const data = await res.json();
      currentTeamsState = data;
      // Sync local backup
      const map = {};
      data.forEach(t => map[t.id] = t.score);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      return currentTeamsState;
    }
  } catch (e) {
    // API not reachable or static host fallback
  }

  // Fallback to local storage
  const localMap = getLocalScores();
  currentTeamsState = HARDCODED_TEAMS.map(team => ({
    ...team,
    score: localMap[team.id] !== undefined ? localMap[team.id] : 0
  }));
  return currentTeamsState;
}

async function updateScoreAPI(teamId, newScore) {
  saveLocalScore(teamId, newScore);

  // Update memory state
  const target = currentTeamsState.find(t => t.id === teamId);
  if (target) target.score = Math.max(0, parseFloat(newScore) || 0);

  try {
    await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, score: newScore })
    });
  } catch (e) {
    console.warn("API update failed, saved to localStorage fallback:", e.message);
  }
}

async function resetAllScoresAPI() {
  saveLocalReset();
  currentTeamsState.forEach(t => t.score = 0);

  try {
    await fetch(`${API_BASE}/reset`, { method: 'POST' });
  } catch (e) {
    console.warn("API reset failed, reset in localStorage fallback:", e.message);
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
}

// =========================================================
// ============  INDEX (SCORE CONTROL) PAGE LOGIC  =========
// =========================================================
const scoreForm = document.getElementById('scoreForm');

if (scoreForm) {
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

  async function renderEntries() {
    await fetchTeams();
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
            <button class="quick-btn plus-btn" data-id="${team.id}" data-delta="1">+1</button>
            <button class="quick-btn plus-btn" data-id="${team.id}" data-delta="5">+5</button>
            <button class="quick-btn plus-btn" data-id="${team.id}" data-delta="10">+10</button>
            <button class="quick-btn minus-btn" data-id="${team.id}" data-delta="-1">-1</button>
            <button class="btn-save" data-id="${team.id}">Save</button>
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

    await updateScoreAPI(teamId, score);
    const teamName = HARDCODED_TEAMS.find(t => t.id === teamId)?.name || 'Team';
    showStatus(`Score for "${teamName}" updated to ${score}.`, 'success');
    renderEntries();
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
      await updateScoreAPI(teamId, newScore);
      showStatus(`"${team.name}" score: ${newScore}`, 'success');
      renderEntries();
      if (teamSelect.value === teamId) {
        teamScoreInput.value = newScore;
      }
    } else if (btn.classList.contains('btn-save')) {
      const row = btn.closest('tr');
      const input = row.querySelector('.table-score-input');
      const newScore = parseFloat(input.value);
      if (!isNaN(newScore) && newScore >= 0) {
        await updateScoreAPI(teamId, newScore);
        showStatus(`"${team.name}" updated to ${newScore}.`, 'success');
        renderEntries();
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
        await updateScoreAPI(teamId, newScore);
        showStatus(`"${team.name}" updated to ${newScore}.`, 'success');
        renderEntries();
      }
    }
  });

  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset ALL team scores to 0?')) {
        await resetAllScoresAPI();
        renderEntries();
        teamScoreInput.value = '';
        teamSelect.value = '';
        showStatus('All team scores reset to 0.', 'success');
      }
    });
  }

  populateDropdown();
  renderEntries();
}

// =========================================================
// ============  LEADERBOARD (DISPLAY) PAGE LOGIC  ==========
// =========================================================
const leaderboardBody = document.getElementById('leaderboardBody');

if (leaderboardBody) {
  const podium = document.getElementById('podium');
  const emptyMsg = document.getElementById('emptyMsg');
  const exportBtn = document.getElementById('exportBtn');
  const searchInput = document.getElementById('searchInput');

  const medals = ['🥇', '🥈', '🥉'];
  const rankClasses = ['gold', 'silver', 'bronze'];

  async function renderLeaderboard() {
    await fetchTeams();
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
    searchInput.addEventListener('input', renderLeaderboard);
  }

  renderLeaderboard();

  // Storage sync listener
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      renderLeaderboard();
    }
  });

  // Polling update every 2 seconds
  setInterval(renderLeaderboard, 2000);
}
