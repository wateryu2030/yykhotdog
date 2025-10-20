import { Router } from "express";
import { InsightsController } from "./insights.controller";
export const insightsRouter = Router();
const ctl = new InsightsController();
insightsRouter.get("/suggestions", ctl.suggestions);
