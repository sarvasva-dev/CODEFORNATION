const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('DNS server override warning:', e.message);
}

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require('path');

const app = express();
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
  { id: 'team-15', name: 'The Dominaters' }
];

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://upcybercrime72_db_user:klx6U8Bcmt1miOT2@cluster0.hwvlfaa.mongodb.net/codefornation?retryWrites=true&w=majority&appName=Cluster0";

let dbCollection = null;

async function initDB() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    const client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });

    await client.connect();
    console.log("✅ MongoDB Atlas Connected Successfully!");
    
    const db = client.db("codefornation");
    dbCollection = db.collection("teams");

    // Seed/Ensure 15 hardcoded teams exist in DB
    for (const team of HARDCODED_TEAMS) {
      await dbCollection.updateOne(
        { id: team.id },
        { $setOnInsert: { id: team.id, name: team.name, score: 0 } },
        { upsert: true }
      );
    }
    console.log("✅ 15 Hardcoded Teams Initialized in MongoDB Atlas.");
  } catch (err) {
    console.error("❌ MongoDB Atlas Connection Error:", err.message);
    console.log("⚠️ Operating in offline mode with in-memory / fallback logic.");
  }
}

// Memory fallback store if DB is offline
const memoryStore = {};
HARDCODED_TEAMS.forEach(t => memoryStore[t.id] = 0);

// API Routes
app.get('/api/scores', async (req, res) => {
  try {
    if (dbCollection) {
      const docs = await dbCollection.find({}).toArray();
      const scoreMap = {};
      docs.forEach(d => { scoreMap[d.id] = d.score; });

      const result = HARDCODED_TEAMS.map(team => ({
        ...team,
        score: scoreMap[team.id] !== undefined ? scoreMap[team.id] : 0
      }));
      return res.json(result);
    }
  } catch (e) {
    console.error("Error fetching scores:", e.message);
  }

  // Fallback
  const result = HARDCODED_TEAMS.map(team => ({
    ...team,
    score: memoryStore[team.id] || 0
  }));
  res.json(result);
});

app.post('/api/scores', async (req, res) => {
  const { teamId, score } = req.body;
  if (!teamId || isNaN(score)) {
    return res.status(400).json({ error: "Invalid teamId or score" });
  }

  const numScore = Math.max(0, parseFloat(score));
  
  try {
    if (dbCollection) {
      await dbCollection.updateOne(
        { id: teamId },
        { $set: { score: numScore } },
        { upsert: true }
      );
      console.log(`Updated team ${teamId} score to ${numScore} in MongoDB`);
    }
  } catch (e) {
    console.error("Error saving score to MongoDB:", e.message);
  }

  memoryStore[teamId] = numScore;
  res.json({ success: true, teamId, score: numScore });
});

app.post('/api/scores/reset', async (req, res) => {
  try {
    if (dbCollection) {
      await dbCollection.updateMany({}, { $set: { score: 0 } });
    }
  } catch (e) {
    console.error("Error resetting scores in MongoDB:", e.message);
  }

  HARDCODED_TEAMS.forEach(t => memoryStore[t.id] = 0);
  res.json({ success: true, message: "All scores reset to 0" });
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Code for the Nation Server running at http://localhost:${PORT}`);
  });
});
