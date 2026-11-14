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

export const env = {
  port: process.env.PORT || 5001,
  mongoUrl: process.env.MONGO_URL,
  jwtSecret: process.env.JWT_SECRET,
};