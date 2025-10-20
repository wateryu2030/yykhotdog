import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { logger } from '../utils/logger';

const router = Router();

// 获取仪表板概览数据
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { level = 'city', from, to } = req.query;
    const view = level === 'city' ? 'vw_kpi_city_daily' : 'vw_kpi_store_daily';

    let whereClause = '';
    if (from && to) {
      whereClause = `WHERE date_key BETWEEN ${from} AND ${to}`;
    }

    const sql = `
      SELECT ${level === 'city' ? 'city' : 'store_name'}, date_key, 
             SUM(revenue) AS revenue, 
             SUM(gross_profit) AS gross_profit, 
             SUM(net_profit) AS net_profit
      FROM ${view} 
      ${whereClause}
      GROUP BY ${level === 'city' ? 'city' : 'store_name'}, date_key 
      ORDER BY date_key DESC
    `;

    const rows = await sequelize.query(sql, { type: QueryTypes.SELECT });
    res.json({ success: true, rows });
  } catch (error) {
    logger.error('Error fetching dashboard overview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});

// 获取实时告警数据
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    const sql = `
      SELECT TOP ${limit} date_key, store_id, alert_type, metric, 
             delta_pct, message, severity
      FROM fact_alerts 
      ORDER BY date_key DESC, severity DESC
    `;

    const rows = await sequelize.query(sql, { type: QueryTypes.SELECT });
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
  }
});

export default router;
