import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";
import { logger } from "../../utils/logger";

function toInt(x: any, def: number) {
  const n = parseInt(String(x));
  return Number.isFinite(n) ? n : def;
}

export class DashboardController {
  /**
   * GET /api/metrics/dashboard?from=YYYYMMDD&to=YYYYMMDD
   * 聚合 vw_kpi_city_daily + vw_revenue_reconciliation
   */
  async overview(req: Request, res: Response) {
    try {
      const from = toInt(req.query.from, 0);
      const to = toInt(req.query.to, 99999999);

      // --- 1. 时间趋势 ---
      const trend = await sequelize.query(`
        SELECT date_key,
               SUM(revenue_gl) AS revenue,
               SUM(gross_profit) AS gross_profit,
               SUM(net_profit) AS net_profit,
               CASE WHEN SUM(revenue_gl)>0
                    THEN SUM(gross_profit)/SUM(revenue_gl)
                    ELSE 0 END AS gross_margin
        FROM vw_revenue_reconciliation
        WHERE date_key BETWEEN ${from} AND ${to}
        GROUP BY date_key
        ORDER BY date_key ASC
      `, { type: QueryTypes.SELECT });

      // --- 2. 城市榜单 ---
      const city_ranking = await sequelize.query(`
        SELECT s.city,
               SUM(fp.revenue) AS revenue,
               SUM(fp.net_profit) AS net_profit,
               CASE WHEN SUM(fp.revenue)>0
                    THEN SUM(fp.revenue - fp.cogs)/SUM(fp.revenue)
                    ELSE 0 END AS gross_margin
        FROM fact_profit_daily fp
        JOIN stores s ON s.id=fp.store_id
        WHERE fp.date_key BETWEEN ${from} AND ${to}
        GROUP BY s.city
        ORDER BY SUM(fp.revenue) DESC
      `, { type: QueryTypes.SELECT });

      // --- 3. 汇总指标 ---
      const summary = {
        total_revenue: 0,
        total_gross_profit: 0,
        total_net_profit: 0,
        avg_gross_margin: 0,
      };
      
      if (trend.length) {
        summary.total_revenue = trend.reduce((s: number, r: any) => s + Number(r.revenue || 0), 0);
        summary.total_gross_profit = trend.reduce((s: number, r: any) => s + Number(r.gross_profit || 0), 0);
        summary.total_net_profit = trend.reduce((s: number, r: any) => s + Number(r.net_profit || 0), 0);
        summary.avg_gross_margin = summary.total_revenue
          ? summary.total_gross_profit / summary.total_revenue
          : 0;
      }

      res.json({ 
        success: true,
        summary, 
        trend, 
        city_ranking 
      });
    } catch (error) {
      logger.error('Error fetching dashboard overview:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch dashboard data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
