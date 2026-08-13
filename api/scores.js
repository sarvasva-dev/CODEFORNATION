const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Ignore in serverless environment
}

const { MongoClient, ServerApiVersion } = require('mongodb');

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

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://upcybercrime72_db_user:klx6U8Bcmt1miOT2@cluster0.hwvlfaa.mongodb.net/codefornation?retryWrites=true&w=majority&appName=Cluster0";

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  await client.connect();
  const db = client.db('codefornation');

  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

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

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('teams');

    // Auto-seed hardcoded teams if missing
    const count = await collection.countDocuments();
    if (count === 0) {
      for (const team of HARDCODED_TEAMS) {
        await collection.updateOne(
          { id: team.id },
          { $setOnInsert: { id: team.id, name: team.name, score: 0 } },
          { upsert: true }
        );
      }
    }

    const isResetAction = req.query.action === 'reset' || req.url.includes('/reset');

    // Handle Reset All Scores
    if (req.method === 'POST' && isResetAction) {
      await collection.updateMany({}, { $set: { score: 0 } });
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
      await collection.updateOne(
        { id: teamId },
        { $set: { score: numScore } },
        { upsert: true }
      );
      return res.status(200).json({ success: true, teamId, score: numScore });
    }

    // Handle GET (Fetch all team scores)
    if (req.method === 'GET') {
      const docs = await collection.find({}).toArray();
      const scoreMap = {};
      docs.forEach(d => { scoreMap[d.id] = d.score; });

      const result = HARDCODED_TEAMS.map(team => ({
        ...team,
        score: scoreMap[team.id] !== undefined ? scoreMap[team.id] : 0
      }));
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Vercel Serverless Function Error:', err.message);
    
    // Memory/Static Fallback on DB Connection Error
    const result = HARDCODED_TEAMS.map(team => ({ ...team, score: 0 }));
    return res.status(200).json(result);
  }
};
