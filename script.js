// ===== VSICS Hackathon Leaderboard Engine (Pure LocalStorage) =====
const STORAGE_KEY = 'vsics_hackathon_leaderboard_v2';

console.log('🚀 [VSICS Leaderboard] Initializing Pure LocalStorage Engine...');

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

// Get array of teams merged with current LocalStorage scores
function getTeams() {
  const map = getScoreMap();
  return HARDCODED_TEAMS.map(team => ({
    ...team,
    score: map[team.id] !== undefined ? Math.max(0, parseFloat(map[team.id]) || 0) : 0
  }));
}

// Update single team score in LocalStorage
function setTeamScore(teamId, newScore) {
  const map = getScoreMap();
  const validScore = Math.max(0, parseFloat(newScore) || 0);
  map[teamId] = validScore;
  saveScoreMap(map);
  console.log(`💾 [LocalStorage] Updated "${teamId}" -> ${validScore} pts`);
}

// Reset all team scores to 0 in LocalStorage
function resetAllScores() {
  const map = {};
  HARDCODED_TEAMS.forEach(t => map[t.id] = 0);
  saveScoreMap(map);
  console.log('🧹 [LocalStorage] All team scores reset to 0.');
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
  const teams = getSortedTeams();
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
  console.log('✅ [CSV Export] Download started.');
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
    const team = getTeams().find(t => t.id === teamId);
    if (team) {
      teamScoreInput.value = team.score;
      teamScoreInput.focus();
    }
  });

  scoreForm.addEventListener('submit', (e) => {
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

    setTeamScore(teamId, score);
    const teamName = HARDCODED_TEAMS.find(t => t.id === teamId)?.name || 'Team';
    showStatus(`Score for "${teamName}" set to ${score}.`, 'success');
    renderEntriesUI();
  });

  entriesBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const teamId = btn.getAttribute('data-id');
    if (!teamId) return;

    const team = getTeams().find(t => t.id === teamId);
    if (!team) return;

    if (btn.classList.contains('quick-btn')) {
      const delta = parseFloat(btn.getAttribute('data-delta')) || 0;
      const newScore = Math.max(0, team.score + delta);
      setTeamScore(teamId, newScore);
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
        setTeamScore(teamId, newScore);
        showStatus(`"${team.name}" updated to ${newScore}.`, 'success');
        renderEntriesUI();
      } else {
        showStatus('Invalid score value.', 'error');
      }
    }
  });

  entriesBody.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('table-score-input')) {
      const teamId = e.target.getAttribute('data-id');
      const newScore = parseFloat(e.target.value);
      const team = getTeams().find(t => t.id === teamId);
      if (team && !isNaN(newScore) && newScore >= 0) {
        setTeamScore(teamId, newScore);
        showStatus(`"${team.name}" updated to ${newScore}.`, 'success');
        renderEntriesUI();
      }
    }
  });

  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset ALL team scores to 0?')) {
        resetAllScores();
        renderEntriesUI();
        teamScoreInput.value = '';
        teamSelect.value = '';
        showStatus('All team scores reset to 0.', 'success');
      }
    });
  }

  populateDropdown();
  renderEntriesUI();
}

// =========================================================
// ============  LEADERBOARD (DISPLAY) PAGE LOGIC  ==========
// =========================================================
const leaderboardBody = document.getElementById('leaderboardBody');

if (leaderboardBody) {
  console.log('🏆 [Leaderboard] Live Leaderboard loaded.');
  const podium = document.getElementById('podium');
  const emptyMsg = document.getElementById('emptyMsg');
  const exportBtn = document.getElementById('exportBtn');
  const searchInput = document.getElementById('searchInput');

  const medals = ['🥇', '🥈', '🥉'];
  const rankClasses = ['gold', 'silver', 'bronze'];

  function renderLeaderboardUI() {
    const allTeams = getSortedTeams();
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

  // Initial render
  renderLeaderboardUI();

  // Polling update every 1.5 seconds for instant refresh
  setInterval(renderLeaderboardUI, 1500);

  // Storage listener for instant cross-tab sync
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      console.log('🔄 [Storage Event] Realtime sync from another tab.');
      renderLeaderboardUI();
    }
  });
}
