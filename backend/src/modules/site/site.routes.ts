import { Router } from "express";
import { SiteController } from "./site.controller";
export const siteRouter = Router();
const ctl = new SiteController();
siteRouter.get("/scores", ctl.scores);