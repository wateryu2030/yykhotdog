import { Router } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';

export const alertsV2 = Router();

alertsV2.get('/alerts', async (_req, res) => {
  const rows = await sequelize.query(`SELECT * FROM hotdog2030.dbo.vw_anomaly_store_daily ORDER BY date_key DESC`, { type: QueryTypes.SELECT });
  res.json({ rows });
});

alertsV2.get('/alerts/rules', async (_req, res) => {
  const rows = await sequelize.query(`SELECT * FROM hotdog2030.dbo.alert_rules WHERE enabled=1`, { type: QueryTypes.SELECT });
  res.json({ rows });
});

alertsV2.post('/alerts/rules', async (req, res) => {
  const { rule_code, metric, window_days=7, drop_pct=null, rise_pct=null, low_threshold=null, high_threshold=null } = req.body || {};
  if(!rule_code || !metric) return res.status(400).json({ error: 'rule_code/metric required' });
  await sequelize.query(`
    MERGE hotdog2030.dbo.alert_rules AS t
    USING (SELECT :rule_code AS rule_code) s
    ON (t.rule_code = s.rule_code)
    WHEN MATCHED THEN UPDATE SET metric=:metric, window_days=:window_days, drop_pct=:drop_pct, rise_pct=:rise_pct, low_threshold=:low_threshold, high_threshold=:high_threshold, enabled=1
    WHEN NOT MATCHED THEN INSERT(rule_code,metric,window_days,drop_pct,rise_pct,low_threshold,high_threshold,enabled)
      VALUES(:rule_code,:metric,:window_days,:drop_pct,:rise_pct,:low_threshold,:high_threshold,1);
  `, { replacements: { rule_code, metric, window_days, drop_pct, rise_pct, low_threshold, high_threshold } as any });
  res.json({ ok:true });
});
