import "dotenv/config";

const required = ["MONGO_URL", "JWT_SECRET"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters");
  process.exit(1);
}

// A username without a password (or the other way round) is always a typo
if (Boolean(process.env.DB_USER) !== Boolean(process.env.DB_PASSWORD)) {
  console.error("Set DB_USER and DB_PASSWORD together, or neither");
  process.exit(1);
}

export const env = {
  port: process.env.PORT || 5001,
  mongoUrl: process.env.MONGO_URL,
  dbName: process.env.DB_NAME || "unque",
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD,
  dbCaFile: process.env.DB_CA_FILE,
  jwtSecret: process.env.JWT_SECRET,
};