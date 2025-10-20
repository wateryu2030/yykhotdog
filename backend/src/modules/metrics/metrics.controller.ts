import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class MetricsController {
  overview = async (req: Request, res: Response) => {
    const from = parseInt(String(req.query.from||0));
    const to = parseInt(String(req.query.to||99999999));
    const level = (req.query.level || "store") as "store"|"city";
    const view = level === "city" ? "vw_kpi_city_daily" : "vw_kpi_store_daily";
    const rows = await sequelize.query(`
      SELECT ${level==="city"?"city":"store_name"}, date_key, SUM(revenue) AS revenue, SUM(net_profit) AS net_profit
      FROM ${view} WHERE date_key BETWEEN ${from} AND ${to}
      GROUP BY ${level==="city"?"city":"store_name"}, date_key ORDER BY date_key DESC`, {
      type: QueryTypes.SELECT
    });
    res.json({ level, from, to, rows });
  };
}