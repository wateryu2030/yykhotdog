import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class SalesController {
  // 支持维度：city | store；支持 period 对比：from/to
  async compare(req: Request, res: Response) {
    const { level='city', from=0, to=99999999 } = req.query as any;
    const view = 'vw_sales_comparison';
    const group = level==='city' ? 'city' : 'store_name';
    const rows = await sequelize.query(`
      SELECT ${group} AS dim, SUM(revenue) AS revenue, SUM(net_profit) AS net_profit,
             CASE WHEN SUM(revenue)>0 THEN SUM(gross_profit)/SUM(revenue) ELSE 0 END AS gross_margin
      FROM ${view} WHERE date_key BETWEEN ${from} AND ${to}
      GROUP BY ${group} ORDER BY revenue DESC
    `, { type: QueryTypes.SELECT });
    res.json({ level, from, to, rows });
  }
}
