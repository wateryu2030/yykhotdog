import { Router } from "express";
import { OpeningController } from "./opening.controller";

export const openingRouter = Router();
const ctl = new OpeningController();

openingRouter.get("/pipeline", ctl.list);
openingRouter.post("/pipeline", ctl.add);
openingRouter.get("/tasks", ctl.tasks);
