import { Router } from "express";
import { SegmentsController } from "./segments.controller";
export const segmentsRouter = Router();
const ctl = new SegmentsController();
segmentsRouter.get("/top", ctl.top);