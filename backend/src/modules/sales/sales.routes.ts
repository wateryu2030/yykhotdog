import { Router } from "express";
import { SalesController } from "./sales.controller";

export const salesRouter = Router();
const ctl = new SalesController();

salesRouter.get("/compare", ctl.compare);
