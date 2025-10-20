import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class AllocationController {
  async result(req: Request, res: Response) {
    const rows = await sequelize.query(`SELECT * FROM vw_allocation_result ORDER BY city`, { type: QueryTypes.SELECT });
    res.json({ rows });
  }
}
