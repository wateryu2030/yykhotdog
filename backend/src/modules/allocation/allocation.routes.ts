import { Router } from "express";
import { AllocationController } from "./allocation.controller";

export const allocationRouter = Router();
const ctl = new AllocationController();

allocationRouter.get("/result", ctl.result);
