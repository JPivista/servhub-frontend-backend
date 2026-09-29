const dns = require("dns");
const mongoose = require("mongoose");
const { webcrypto } = require("crypto");
const { mongoUri } = require("./env");

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

// Windows DNS often returns a bad SRV answer for mongodb+srv. Use public resolvers.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const dbConnect = async () => {
  if (mongoose.connection.readyState >= 1) return;
  const uri = mongoUri();
  if (!uri) {
    throw new Error(
      "CONNECTION_STRING is not set. Add CONNECTION_STRING (and JWT_SECRET) in Vercel → Project → Settings → Environment Variables for Production and Preview, then redeploy."
    );
  }
  await mongoose.connect(uri);
  console.log(`Connected to MongoDB: ${mongoose.connection.host}, ${mongoose.connection.name}`);
};

module.exports = dbConnect;
