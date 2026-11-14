import express from "express"
import mongoose from "mongoose"
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
// The order of these routes are important
app.use('/users', userRoutes);
app.use('/professor',professorRoutes);
app.use('/general', generalRoutes);
app.use(notFound)
app.use(errorMiddleware)
mongoose.connect(env.mongoUrl, {
}).then(() => {
    app.listen(env.port, () => console.log(`Server Port: ${env.port}`));  
}).catch((error) => console.log(`${error} did not connect`)); 

