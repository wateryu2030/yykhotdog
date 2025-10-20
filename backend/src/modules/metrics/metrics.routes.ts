import { Router } from "express";
import { MetricsController } from "./metrics.controller";
import { DashboardController } from "./dashboard.controller";

export const metricsRouter = Router();
const ctl = new MetricsController();
const dash = new DashboardController();

metricsRouter.get("/overview", ctl.overview);
metricsRouter.get("/dashboard", dash.overview);