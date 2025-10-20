import { Router } from "express";
import { OperationsController } from "./operations.controller";

export const operationsRouter = Router();
const ctl = new OperationsController();

operationsRouter.get("/stores/kpi", ctl.storesKPI);
