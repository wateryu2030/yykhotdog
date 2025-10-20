import { Router } from "express";
import { CompetitorsController } from "./competitors.controller";
export const competitorsRouter = Router();
const ctl = new CompetitorsController();
competitorsRouter.get("/fetch", ctl.fetch);
competitorsRouter.get("/list", ctl.list);
