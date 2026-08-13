require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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

const SUPABASE_URL = process.env.SUPABASE_URL || "https://uqgtwvbwruhwkkpvuanv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxZ3R3dmJ3cnVod2trcHZ1YW52Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQzNTc0MSwiZXhwIjoyMTAyMDExNzQxfQ.gUNRU-y98XkHGMe2S0hVFKzPCRwp-Kvy84Kf6E8R0Hw";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '##HELLOCODEFORNATION';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// WebSocket Server for Ultra-Fast Live Broadcasting
const wss = new WebSocketServer({ server });

wss.on('connection', async (ws) => {
  console.log('⚡ [WebSocket] Client connected to live leaderboard stream.');
  
  // Send current scores, repos & live URLs immediately upon connection
  const scores = await fetchAllScores();
  ws.send(JSON.stringify({ type: 'SCORES_UPDATED', scores }));

  ws.on('close', () => {
    console.log('🔌 [WebSocket] Client disconnected.');
  });
});

function broadcastScores(scores) {
  const payload = JSON.stringify({ type: 'SCORES_UPDATED', scores });
  let count = 0;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
      count++;
    }
  });
  console.log(`📡 [WebSocket Broadcast] Sent live scores to ${count} active clients.`);
}

// Memory fallback stores if DB is offline
const memoryStore = {};
const repoStore = {};
const liveStore = {};
HARDCODED_TEAMS.forEach(t => {
  memoryStore[t.id] = 0;
  repoStore[t.id] = '';
  liveStore[t.id] = '';
});

async function fetchAllScores() {
  try {
    const { data, error } = await supabase.from('teams').select('*');
    if (!error && data) {
      const scoreMap = {};
      const repoMap = {};
      const liveMap = {};
      data.forEach(d => {
        scoreMap[d.id] = Number(d.score) || 0;
        if (d.repo_url) repoMap[d.id] = d.repo_url;
        if (d.live_url) liveMap[d.id] = d.live_url;
      });

      return HARDCODED_TEAMS.map(team => ({
        ...team,
        score: scoreMap[team.id] !== undefined ? scoreMap[team.id] : (memoryStore[team.id] || 0),
        repo_url: repoMap[team.id] || repoStore[team.id] || '',
        live_url: liveMap[team.id] || liveStore[team.id] || ''
      }));
    }
  } catch (e) {
    console.error("Error fetching scores from Supabase:", e.message);
  }

  return HARDCODED_TEAMS.map(team => ({
    ...team,
    score: memoryStore[team.id] || 0,
    repo_url: repoStore[team.id] || '',
    live_url: liveStore[team.id] || ''
  }));
}

// Initialize & seed missing hardcoded teams in Supabase
async function initDB() {
  try {
    console.log("⚡ Checking Supabase Connection...");
    const { data, error } = await supabase.from('teams').select('id, name, score');
    if (error) {
      console.warn("⚠️ Supabase Notice:", error.message);
      console.log("👉 Please run schema.sql in Supabase SQL Editor to create the table.");
      return;
    }
    console.log("✅ Supabase Connected Successfully! Found", data.length, "teams.");

    // Seed missing teams if needed
    const existingIds = new Set(data.map(d => d.id));
    const missingTeams = HARDCODED_TEAMS.filter(t => !existingIds.has(t.id)).map(t => ({
      id: t.id,
      name: t.name,
      score: 0
    }));

    if (missingTeams.length > 0) {
      const { error: seedErr } = await supabase.from('teams').upsert(missingTeams);
      if (seedErr) console.warn("Seed error:", seedErr.message);
      else console.log(`✅ Seeded ${missingTeams.length} missing teams in Supabase.`);
    }
  } catch (err) {
    console.error("❌ Supabase Init Error:", err.message);
  }
}

// API Routes
app.get('/api/scores', async (req, res) => {
  const scores = await fetchAllScores();
  res.json(scores);
});

// Endpoint for Team Leaders to submit GitHub Repo & Live Website URL
app.post('/api/submit-repo', async (req, res) => {
  const { teamId, repoUrl, liveUrl } = req.body || {};
  if (!teamId) {
    return res.status(400).json({ error: "Team selection is required." });
  }

  const teamObj = HARDCODED_TEAMS.find(t => t.id === teamId);
  const teamName = teamObj ? teamObj.name : teamId;

  const updatePayload = {
    id: teamId,
    name: teamName,
    updated_at: new Date()
  };

  if (repoUrl !== undefined) {
    const cleanRepo = String(repoUrl).trim();
    updatePayload.repo_url = cleanRepo;
    repoStore[teamId] = cleanRepo;
  }

  if (liveUrl !== undefined) {
    const cleanLive = String(liveUrl).trim();
    updatePayload.live_url = cleanLive;
    liveStore[teamId] = cleanLive;
  }

  try {
    const { error } = await supabase
      .from('teams')
      .upsert(updatePayload);

    if (error) {
      console.error("Error updating links in Supabase:", error.message);
    } else {
      console.log(`✅ Submitted Links for ${teamName} (${teamId}): Repo="${updatePayload.repo_url||''}", Live="${updatePayload.live_url||''}"`);
    }
  } catch (e) {
    console.error("Supabase Submission Error:", e.message);
  }

  // Broadcast updated scores & repo/live links via WebSockets
  const updatedScores = await fetchAllScores();
  broadcastScores(updatedScores);

  res.json({
    success: true,
    teamId,
    repoUrl: repoStore[teamId] || '',
    liveUrl: liveStore[teamId] || '',
    message: `Links submitted successfully for ${teamName}!`
  });
});

app.post('/api/scores', async (req, res) => {
  const reqPass = req.headers['x-admin-password'] || req.body?.adminPassword;
  if (reqPass !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized. Valid Admin Password required." });
  }

  const { teamId, score } = req.body;
  if (!teamId || isNaN(score)) {
    return res.status(400).json({ error: "Invalid teamId or score" });
  }

  const numScore = Math.max(0, parseFloat(score));
  const teamObj = HARDCODED_TEAMS.find(t => t.id === teamId);
  const teamName = teamObj ? teamObj.name : teamId;

  try {
    const { error } = await supabase
      .from('teams')
      .upsert({ id: teamId, name: teamName, score: numScore, updated_at: new Date() });
    
    if (error) {
      console.error("Error saving score to Supabase:", error.message);
    } else {
      console.log(`Updated team ${teamId} score to ${numScore} in Supabase`);
    }
  } catch (e) {
    console.error("Supabase Score Save Error:", e.message);
  }

  memoryStore[teamId] = numScore;

  // Fetch updated scores and broadcast to WebSockets instantly
  const updatedScores = await fetchAllScores();
  broadcastScores(updatedScores);

  res.json({ success: true, teamId, score: numScore });
});

app.post('/api/scores/reset', async (req, res) => {
  const reqPass = req.headers['x-admin-password'] || req.body?.adminPassword;
  if (reqPass !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized. Valid Admin Password required." });
  }

  try {
    const { error } = await supabase
      .from('teams')
      .update({ score: 0, updated_at: new Date() })
      .neq('id', '');

    if (error) console.error("Error resetting scores in Supabase:", error.message);
  } catch (e) {
    console.error("Supabase Reset Error:", e.message);
  }

  HARDCODED_TEAMS.forEach(t => memoryStore[t.id] = 0);

  // Fetch reset scores and broadcast to WebSockets instantly
  const updatedScores = await fetchAllScores();
  broadcastScores(updatedScores);

  res.json({ success: true, message: "All scores reset to 0" });
});

initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Code for the Nation Server with WebSocket running at http://localhost:${PORT}`);
  });
});
