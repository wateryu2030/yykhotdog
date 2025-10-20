import { Router } from "express";
import { SiteSelectionController } from "./siteSelection.controller";

export const siteSelectionRouter = Router();
const controller = new SiteSelectionController();

// 城市相关API
siteSelectionRouter.get("/cities", controller.cities);
siteSelectionRouter.get("/candidates", controller.candidates);
siteSelectionRouter.get("/ai-suggest", controller.aiSuggest);
siteSelectionRouter.get("/stores", controller.stores);

// 人工操作API
siteSelectionRouter.post("/override", controller.override);