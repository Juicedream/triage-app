import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import cookieParser from "cookie-parser";

/**
 * Custom modules
 */
import loadRoutes from "./routes/index_routes.js";
import errorHandler from "errorhandler";
import connectToDb from "./db/index.js";
// import globalErrorHandler from "./core/global_error_handler.js";

const app: Application = express();

// Connecting to the neon Db
connectToDb();

// Parse incoming JSON payloads for all API routes (req.body)
app.use(express.json());

// Parse incoming request with cookie data for extra validation
app.use(cookieParser());

// Loads all the routers from the index_routes.ts
loadRoutes(app);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Triage Backend is healthy...",
  });
});

// Handles global handling
app.use(errorHandler());

export default app;
