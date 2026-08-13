// ===== Shared config =====
const STORAGE_KEY = 'vsics_hackathon_leaderboard';

function getTeams() {
  const raw = localStorage.getItem(STORAGE_KEY);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveTeams(teams) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

function sortedTeams() {
  return [...getTeams()].sort((a, b) => b.score - a.score);
}

// =========================================================
// ============  INDEX (INPUT) PAGE LOGIC  ==================
// =========================================================
const scoreForm = document.getElementById('scoreForm');

if (scoreForm) {
  const teamNameInput = document.getElementById('teamName');
  const teamScoreInput = document.getElementById('teamScore');
  const statusMsg = document.getElementById('statusMsg');
  const entriesBody = document.getElementById('entriesBody');
  const entryCount = document.getElementById('entryCount');
  const clearAllBtn = document.getElementById('clearAllBtn');

  let editId = null; // track if we are editing an existing entry

  function renderEntries() {
    const teams = getTeams();
    entryCount.textContent = teams.length;
    entriesBody.innerHTML = '';

    if (teams.length === 0) {
      entriesBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#888;">No entries yet</td></tr>';
      return;
    }

    teams
      .slice()
      .sort((a, b) => b.score - a.score)
      .forEach((team, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${escapeHtml(team.name)}</td>
          <td>${team.score}</td>
          <td>
            <button class="edit-btn" data-id="${team.id}">Edit</button>
            <button class="del-btn" data-id="${team.id}">Delete</button>
          </td>
        `;
        entriesBody.appendChild(tr);
      });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showStatus(message, type) {
    statusMsg.textContent = message;
    statusMsg.className = 'status-msg ' + type;
    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
    }, 2500);
  }

  scoreForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = teamNameInput.value.trim();
    const score = parseFloat(teamScoreInput.value);

    if (!name || isNaN(score)) {
      showStatus('Please enter a valid team name and score.', 'error');
      return;
    }

    let teams = getTeams();

    if (editId) {
      // update existing
      teams = teams.map((t) => (t.id === editId ? { ...t, name, score } : t));
      showStatus(`Updated "${name}" successfully.`, 'success');
      editId = null;
      scoreForm.querySelector('.btn.primary').textContent = 'Add / Update Team';
    } else {
      // check duplicate name -> update instead of duplicate entry
      const existing = teams.find(
        (t) => t.name.toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        existing.score = score;
        showStatus(`Team "${name}" already existed — score updated.`, 'success');
      } else {
        teams.push({ id: Date.now().toString(), name, score });
        showStatus(`Team "${name}" added successfully.`, 'success');
      }
    }

    saveTeams(teams);
    scoreForm.reset();
    teamNameInput.focus();
    renderEntries();
  });

  entriesBody.addEventListener('click', (e) => {
    const id = e.target.getAttribute('data-id');
    if (!id) return;

    if (e.target.classList.contains('del-btn')) {
      let teams = getTeams();
      teams = teams.filter((t) => t.id !== id);
      saveTeams(teams);
      renderEntries();
      showStatus('Entry deleted.', 'success');
    }

    if (e.target.classList.contains('edit-btn')) {
      const teams = getTeams();
      const team = teams.find((t) => t.id === id);
      if (team) {
        teamNameInput.value = team.name;
        teamScoreInput.value = team.score;
        editId = team.id;
        scoreForm.querySelector('.btn.primary').textContent = 'Update Team';
        teamNameInput.focus();
      }
    }
  });

  clearAllBtn.addEventListener('click', () => {
    if (confirm('This will delete ALL team entries. Are you sure?')) {
      localStorage.removeItem(STORAGE_KEY);
      renderEntries();
      showStatus('All data cleared.', 'success');
    }
  });

  renderEntries();
}

// =========================================================
// ============  LEADERBOARD (DISPLAY) PAGE LOGIC  ==========
// =========================================================
const leaderboardBody = document.getElementById('leaderboardBody');

if (leaderboardBody) {
  const podium = document.getElementById('podium');
  const emptyMsg = document.getElementById('emptyMsg');

  const medals = ['🥇', '🥈', '🥉'];
  const rankClasses = ['gold', 'silver', 'bronze'];

  function renderLeaderboard() {
    const teams = sortedTeams();
    leaderboardBody.innerHTML = '';
    podium.innerHTML = '';

    if (teams.length === 0) {
      emptyMsg.style.display = 'block';
      return;
    }
    emptyMsg.style.display = 'none';

    // Podium (top 3)
    teams.slice(0, 3).forEach((team, index) => {
      const div = document.createElement('div');
      div.className = `podium-item rank-${index + 1}`;
      div.innerHTML = `
        <div class="podium-medal">${medals[index]}</div>
        <div class="podium-name">${escapeHtmlLB(team.name)}</div>
        <div class="podium-score">${team.score}</div>
      `;
      podium.appendChild(div);
    });

    // Full table
    teams.forEach((team, index) => {
      const tr = document.createElement('tr');
      const rankClass = rankClasses[index] || '';
      tr.innerHTML = `
        <td class="rank-cell ${rankClass}">${index + 1}</td>
        <td>${escapeHtmlLB(team.name)}</td>
        <td>${team.score}</td>
      `;
      leaderboardBody.appendChild(tr);
    });
  }

  function escapeHtmlLB(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  renderLeaderboard();

  // Live update when data changes in another tab (input page)
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      renderLeaderboard();
    }
  });

  // Fallback polling every 2s (covers same-tab / edge cases)
  setInterval(renderLeaderboard, 2000);
}
