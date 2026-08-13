const { createClient } = require('@supabase/supabase-js');

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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const fallbackStore = {};
const repoFallback = {};
const liveFallback = {};
HARDCODED_TEAMS.forEach(t => {
  fallbackStore[t.id] = 0;
  repoFallback[t.id] = '';
  liveFallback[t.id] = '';
});

module.exports = async function handler(req, res) {
  // Enable CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const urlStr = req.url || '';
  const isResetAction = req.query?.action === 'reset' || urlStr.includes('/reset');
  const isSubmitRepoAction = req.query?.action === 'submit-repo' || urlStr.includes('submit-repo');
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '##HELLOCODEFORNATION';

  try {
    // Handle Team Leader Repo & Live Link Submission (Public endpoint)
    if (req.method === 'POST' && isSubmitRepoAction) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { teamId, repoUrl, liveUrl } = body || {};

      if (!teamId) {
        return res.status(400).json({ error: 'Team selection is required.' });
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
        repoFallback[teamId] = cleanRepo;
      }

      if (liveUrl !== undefined) {
        const cleanLive = String(liveUrl).trim();
        updatePayload.live_url = cleanLive;
        liveFallback[teamId] = cleanLive;
      }

      await supabase.from('teams').upsert(updatePayload);

      return res.status(200).json({
        success: true,
        teamId,
        repoUrl: repoFallback[teamId] || '',
        liveUrl: liveFallback[teamId] || ''
      });
    }

    // Check admin password for score mutation (POST)
    if (req.method === 'POST') {
      const reqPass = req.headers['x-admin-password'] || req.body?.adminPassword;
      if (reqPass !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized. Valid Admin Password required.' });
      }
    }

    // Handle Reset All Scores
    if (req.method === 'POST' && isResetAction) {
      await supabase.from('teams').update({ score: 0, updated_at: new Date() }).neq('id', '');
      HARDCODED_TEAMS.forEach(t => fallbackStore[t.id] = 0);
      return res.status(200).json({ success: true, message: 'All team scores reset to 0' });
    }

    // Handle Score Update
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { teamId, score } = body || {};

      if (!teamId || isNaN(score)) {
        return res.status(400).json({ error: 'Invalid teamId or score' });
      }

      const numScore = Math.max(0, parseFloat(score));
      const teamObj = HARDCODED_TEAMS.find(t => t.id === teamId);
      const teamName = teamObj ? teamObj.name : teamId;

      await supabase.from('teams').upsert({
        id: teamId,
        name: teamName,
        score: numScore,
        updated_at: new Date()
      });

      fallbackStore[teamId] = numScore;
      return res.status(200).json({ success: true, teamId, score: numScore });
    }

    // Handle GET (Fetch all team scores & repos & live links)
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('teams').select('*');
      
      const scoreMap = {};
      const repoMap = {};
      const liveMap = {};
      if (!error && data) {
        data.forEach(d => {
          scoreMap[d.id] = Number(d.score) || 0;
          if (d.repo_url) repoMap[d.id] = d.repo_url;
          if (d.live_url) liveMap[d.id] = d.live_url;
        });
      }

      const result = HARDCODED_TEAMS.map(team => ({
        ...team,
        score: scoreMap[team.id] !== undefined ? scoreMap[team.id] : (fallbackStore[team.id] || 0),
        repo_url: repoMap[team.id] || repoFallback[team.id] || '',
        live_url: liveMap[team.id] || liveFallback[team.id] || ''
      }));
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Vercel Serverless Function Error:', err.message);

    const result = HARDCODED_TEAMS.map(team => ({
      ...team,
      score: fallbackStore[team.id] !== undefined ? fallbackStore[team.id] : 0,
      repo_url: repoFallback[team.id] || '',
      live_url: liveFallback[team.id] || ''
    }));
    return res.status(200).json(result);
  }
};
