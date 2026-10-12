const mongoose = require('mongoose');
const dns = require('dns');

// Ensure SRV DNS resolution succeeds across all network environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in restricted environments
}

let cachedConnection = null;

// Verified MongoDB Atlas Cluster URI
const HARDCODED_ATLAS_URI =
  'mongodb+srv://vinod:Vinod%40807465@marketmind-ai.gmwcc2v.mongodb.net/marketmind?retryWrites=true&w=majority&appName=MarketMind-Ai';
const LOCAL_URI = 'mongodb://localhost:27017/marketmind';

/**
 * Connect to MongoDB database instance
 * Supports serverless connection caching, hardcoded Atlas credentials, and local fallback
 * @returns {Promise<typeof mongoose|null>} Mongoose connection promise or null on fallback
 */
const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  const urisToAttempt = [];
  if (process.env.MONGODB_URI) {
    urisToAttempt.push(process.env.MONGODB_URI);
  }
  urisToAttempt.push(HARDCODED_ATLAS_URI);
  urisToAttempt.push(LOCAL_URI);

  for (const uri of urisToAttempt) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });
      cachedConnection = conn;
      console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (error) {
      console.warn(`[MongoDB] Connection attempt failed for ${uri.split('@').pop()}: ${error.message}`);
    }
  }

  console.warn('[MongoDB] Direct database connections failed. Operating in resilient fallback mode.');
  return null;
};

module.exports = connectDB;
