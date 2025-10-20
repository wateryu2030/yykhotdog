import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

/**
 * 智能驾驶舱 AI 建议接口
 * 规则化诊断 + 简易智能打分
 */
export class InsightsController {
  async suggestions(req: Request, res: Response) {
    const { scope = "city", from = 0, to = 99999999 } = req.query as any;
    const table = scope === "store" ? "vw_kpi_store_daily" : "vw_kpi_city_daily";

    const rows:any[] = await sequelize.query(`
      SELECT ${scope==="store"?"store_name":"city"} AS dim,
             SUM(revenue) AS revenue,
             SUM(gross_profit) AS gross_profit,
             SUM(net_profit) AS net_profit,
             CASE WHEN SUM(revenue)>0 THEN SUM(gross_profit)/SUM(revenue) ELSE 0 END AS gross_margin,
             AVG(orders_cnt) AS orders_avg
      FROM ${table}
      WHERE date_key BETWEEN ${from} AND ${to}
      GROUP BY ${scope==="store"?"store_name":"city"}
    `, { type: QueryTypes.SELECT });

    const suggestions = rows.map(r => {
      const tips:string[] = [];
      const gm = Number(r.gross_margin||0);
      const rev = Number(r.revenue||0);
      const net = Number(r.net_profit||0);
      const ord = Number(r.orders_avg||0);

      if (rev === 0) tips.push("⚠️ 收入为 0，门店可能未运营或数据异常。");
      if (gm < 0.35) tips.push("🔻 毛利率偏低，建议检查原料成本或折扣策略。");
      if (net < 0) tips.push("💸 净利为负，建议复盘期间费用与销售结构。");
      if (ord < 10) tips.push("🧊 订单量偏低，需强化促销活动或提高曝光。");
      if (gm >= 0.5 && net > 0) tips.push("✅ 表现良好，可考虑扩大营销预算或新店复制。");

      return {
        dimension: r.dim,
        revenue: rev,
        gross_profit: r.gross_profit,
        net_profit: r.net_profit,
        gross_margin: gm,
        orders_avg: ord,
        advice: tips
      };
    });

    res.json({ scope, from, to, suggestions });
  }
}
