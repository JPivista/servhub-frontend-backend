function mongoUri() {
  return (
    process.env.CONNECTION_STRING ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.MONGODB_URL ||
    ""
  );
}

function jwtSecret() {
  return process.env.JWT_SECRET || "";
}

module.exports = { mongoUri, jwtSecret };
