import { Router } from "express";
import { AlertsController } from "./alerts.controller";
export const alertsRouter = Router();
const ctl = new AlertsController();
alertsRouter.get("/", ctl.list);