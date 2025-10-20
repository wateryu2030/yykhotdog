import { Router } from "express";
import { ProfilesController } from "./profiles.controller";

export const profilesRouter = Router();
const ctl = new ProfilesController();

profilesRouter.get("/customers", ctl.customers);
profilesRouter.get("/products", ctl.products);
profilesRouter.get("/cities", ctl.cities);
