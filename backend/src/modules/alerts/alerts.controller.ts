import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class AlertsController {
  list = async (req: Request, res: Response) => {
    const limit = parseInt(String(req.query.limit || 10));
    const rows = await sequelize.query(`
      SELECT TOP ${limit} date_key, store_id, alert_type, metric, current_val, baseline_val, delta_pct, message
      FROM dbo.fact_alerts 
      ORDER BY date_key DESC`, {
      type: QueryTypes.SELECT
    });
    res.json({ success: true, data: rows });
  };
}