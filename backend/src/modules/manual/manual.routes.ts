import { Router } from "express";
import { ManualController } from "./manual.controller";
export const manualRouter = Router();
const ctl = new ManualController();
manualRouter.post("/save", ctl.save);
manualRouter.get("/list", ctl.list);
