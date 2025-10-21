import { Router, Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';

export const metricsV2 = Router();

metricsV2.get('/metrics/dashboard', async (req: Request, res: Response) => {
  const from = Number(req.query.from || 0);
  const to   = Number(req.query.to || 99999999);
  const scope = (req.query.scope as 'city'|'store') || 'city';
  const table = scope==='store' ? 'hotdog2030.dbo.vw_kpi_store_daily' : 'hotdog2030.dbo.vw_kpi_city_daily';
  const dim = scope==='store' ? 'store_id, store_name' : 'city_id, city';

  const rows:any[] = await sequelize.query(`
    SELECT ${dim},
           SUM(revenue) AS revenue,
           SUM(gross_profit) AS gross_profit,
           SUM(net_profit) AS net_profit,
           SUM(orders_cnt) AS orders_cnt
    FROM ${table}
    WHERE date_key BETWEEN :from AND :to
    GROUP BY ${dim}
    ORDER BY SUM(revenue) DESC
  `, { type: QueryTypes.SELECT, replacements: { from, to } });

  const trend:any[] = await sequelize.query(`
    SELECT date_key,
           SUM(revenue) AS revenue,
           SUM(gross_profit) AS gross_profit,
           SUM(net_profit) AS net_profit,
           SUM(orders_cnt) AS orders_cnt
    FROM ${table}
    WHERE date_key BETWEEN :from AND :to
    GROUP BY date_key
    ORDER BY date_key
  `, { type: QueryTypes.SELECT, replacements: { from, to } });

  const summary = trend.reduce((a:any, r:any)=>({
    revenue: a.revenue + Number(r.revenue||0),
    gross_profit: a.gross_profit + Number(r.gross_profit||0),
    net_profit: a.net_profit + Number(r.net_profit||0),
    orders_cnt: a.orders_cnt + Number(r.orders_cnt||0),
  }), {revenue:0,gross_profit:0,net_profit:0,orders_cnt:0});
  const avg_gross_margin = summary.revenue ? summary.gross_profit/summary.revenue : 0;
  const avg_order_value  = summary.orders_cnt ? summary.revenue/summary.orders_cnt : 0;

  res.json({
    scope, timeRange: { from, to },
    summary: { ...summary, avg_gross_margin, avg_order_value },
    ranking: rows, trend
  });
});

metricsV2.get('/metrics/reconciliation', async (req: Request, res: Response) => {
  const from = Number(req.query.from || 0);
  const to   = Number(req.query.to || 99999999);
  const store_id = req.query.store_id ? Number(req.query.store_id) : null;
  const extra = store_id ? ' AND store_id = :store_id' : '';
  const rows:any[] = await sequelize.query(`
    SELECT date_key, store_id, channel,
           revenue_gl, gross_profit, net_profit,
           platform_commission, delivery_fee, marketing_subsidy,
           coupon_cost, refund_amount, tax
    FROM hotdog2030.dbo.vw_revenue_reconciliation
    WHERE date_key BETWEEN :from AND :to ${extra}
    ORDER BY date_key
  `, { type: QueryTypes.SELECT, replacements: { from, to, store_id } });

  res.json({ rows });
});
