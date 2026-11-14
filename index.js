import express from "express"
import { connectDb, disconnectDb, isDbConnected } from "./config/db.js"
import cors from "cors"
import { env } from "./config/env.js"
import helmet from "helmet"
import morgan from "morgan" 
import {notFound, errorMiddleware} from "./middleware/error.js"

// import errorMiddleware from "./middleware/error.js"
import userRoutes from "./routes/user.js"
import professorRoutes from "./routes/proff.js"
import generalRoutes from "./routes/general.js"



const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({policy: "cross-origin"}));
app.use(morgan("common"))
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.get("/health", (req, res) => {
  const dbUp = isDbConnected();
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? "ok" : "degraded", db: dbUp ? "up" : "down" });
});

// The order of these routes are important
app.use('/users', userRoutes);
app.use('/professor',professorRoutes);
app.use('/general', generalRoutes);
app.use(notFound)
app.use(errorMiddleware)
const start = async () => {
  try {
    await connectDb();
  } catch (error) {
    console.error("Could not connect to the database:", error.message);
    process.exit(1);
  }

  const server = app.listen(env.port, () =>
    console.log(`Listening on port ${env.port}`)
  );

  // systemd sends SIGTERM on stop and restart. Let in-flight requests finish,
  // close the database connection, then exit.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    setTimeout(() => process.exit(1), 10000).unref(); // don't hang on idle keep-alives
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

start(); 

