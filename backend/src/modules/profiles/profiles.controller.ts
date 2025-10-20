import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class ProfilesController {
  async customers(req: Request, res: Response) {
    const rows = await sequelize.query(`SELECT TOP 100 * FROM vw_customer_profile ORDER BY total_spent DESC`, { type: QueryTypes.SELECT });
    res.json({ rows });
  }
  async products(req: Request, res: Response) {
    const rows = await sequelize.query(`SELECT TOP 200 * FROM vw_product_profile ORDER BY sales_amount DESC`, { type: QueryTypes.SELECT });
    res.json({ rows });
  }
  async cities(req: Request, res: Response) {
    const rows = await sequelize.query(`SELECT * FROM vw_city_profile ORDER BY revenue DESC`, { type: QueryTypes.SELECT });
    res.json({ rows });
  }
}
