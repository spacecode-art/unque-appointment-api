import mongoose from "mongoose";
import { env } from "./env.js";

const looksLikeDocumentDb = (uri) => uri.includes(".docdb.amazonaws.com");

export const connectDb = async () => {
  // DocumentDB rejects retryable writes, which the driver turns on by default.
  // Better to stop here with a clear message than to let the first write fail.
  if (looksLikeDocumentDb(env.mongoUrl) && !env.mongoUrl.includes("retryWrites=false")) {
    throw new Error("DocumentDB needs retryWrites=false in MONGO_URL");
  }

  const options = {
    dbName: env.dbName,
    // The default wait is 30s. A wrong security group looks like a hang,
    // so fail fast and make it obvious.
    serverSelectionTimeoutMS: 10000,
  };
  if (env.dbCaFile) {
    options.tlsCAFile = env.dbCaFile;
  }
  if (env.dbUser) {
    options.user = env.dbUser;
    options.pass = env.dbPassword;
  }

  mongoose.connection.on("disconnected", () => console.warn("Database connection lost"));
  mongoose.connection.on("reconnected", () => console.log("Database connection restored"));

  await mongoose.connect(env.mongoUrl, options);
  console.log("Database connected");
};

export const disconnectDb = () => mongoose.connection.close();

export const isDbConnected = () => mongoose.connection.readyState === 1;