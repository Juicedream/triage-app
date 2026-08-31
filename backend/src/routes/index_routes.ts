import { type Application } from "express";
import authRoutes from "./auth_routes.js";

// To load all routes at once on the app.ts file instead of bombarding all the routes there
const loadRoutes = (app: Application) => {
  const API_PREFIX = "/api/v1";

  app.use(`${API_PREFIX}/auth`, authRoutes);
};

export default loadRoutes;
