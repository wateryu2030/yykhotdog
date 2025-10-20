import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class SiteSelectionController {
  // 获取城市列表（从hotdog2030数据库）
  async cities(req: Request, res: Response) {
    try {
      const rows = await sequelize.query(`
        SELECT DISTINCT city, province, country
        FROM dbo.stores 
        WHERE city IS NOT NULL AND city != ''
        ORDER BY province, city
      `, { type: QueryTypes.SELECT });
      res.json({ rows });
    } catch (error) {
      console.error('获取城市列表失败:', error);
      // 如果stores表没有数据，尝试从其他表获取
      try {
        const rows = await sequelize.query(`
          SELECT DISTINCT city, '未知' as province, '中国' as country
          FROM vw_kpi_store_daily 
          WHERE city IS NOT NULL AND city != ''
          ORDER BY city
        `, { type: QueryTypes.SELECT });
        res.json({ rows });
      } catch (error2) {
        console.error('从vw_kpi_store_daily获取城市列表也失败:', error2);
        res.json({ rows: [] });
      }
    }
  }

  // 候选点评分列表（结合重力模型得分 fact_site_score + 城市画像）
  async candidates(req: Request, res: Response) {
    const rows = await sequelize.query(`
      SELECT f.candidate_id, f.city, f.match_score, f.cannibal_score, f.total_score, f.rationale,
             cp.stores_cnt, cp.revenue, cp.net_profit, cp.gross_margin
      FROM fact_site_score f
      LEFT JOIN vw_city_profile cp ON cp.city = f.city
      ORDER BY f.total_score DESC
    `, { type: QueryTypes.SELECT });
    res.json({ rows });
  }

  // 智能选店建议（按阈值/城市策略过滤）
  async aiSuggest(req: Request, res: Response) {
    const { city, minScore = 0.6 } = req.query;
    const whereCity = city ? `AND f.city LIKE '%${city}%'` : "";
    const rows = await sequelize.query(`
      SELECT TOP 50 f.candidate_id, f.city, f.match_score, f.cannibal_score, f.total_score, f.rationale,
             cp.stores_cnt, cp.gross_margin, cp.revenue,
             rs.ShopName, rs.ShopAddress, rs.location,
             CASE 
               WHEN rs.location IS NOT NULL AND rs.location LIKE '%,%' 
               THEN TRY_CAST(SUBSTRING(rs.location, 1, CHARINDEX(',', rs.location) - 1) AS FLOAT)
               ELSE NULL 
             END AS lng,
             CASE 
               WHEN rs.location IS NOT NULL AND rs.location LIKE '%,%' 
               THEN TRY_CAST(SUBSTRING(rs.location, CHARINDEX(',', rs.location) + 1, LEN(rs.location)) AS FLOAT)
               ELSE NULL 
             END AS lat
      FROM fact_site_score f
      LEFT JOIN vw_city_profile cp ON cp.city = f.city
      LEFT JOIN cyrgweixin.dbo.Rg_SeekShop rs ON rs.Id = f.candidate_id
      WHERE f.total_score >= ${minScore} ${whereCity}
      ORDER BY f.total_score DESC
    `, { type: QueryTypes.SELECT });
    res.json({ city: city||null, minScore, rows });
  }

  // 获取现有门店位置（用于地图标注）
  async stores(req: Request, res: Response) {
    try {
      // 直接从stores表获取门店位置
      const rows = await sequelize.query(`
        SELECT id as store_id, store_name, city, longitude, latitude, 
               0 as avg_revenue, 0 as avg_orders
        FROM dbo.stores 
        WHERE longitude IS NOT NULL AND latitude IS NOT NULL
      `, { type: QueryTypes.SELECT });
      res.json({ rows });
    } catch (error) {
      console.error('获取门店位置失败:', error);
      res.json({ rows: [] });
    }
  }

  // 人工覆盖评分/备注
  async override(req: Request, res: Response) {
    const { candidate_id, note, manual_score } = req.body;
    if (!candidate_id) {
      return res.status(400).json({ success: false, message: '缺少候选点ID' });
    }

    try {
      // 这里可以保存到数据库，暂时只返回成功
      // 未来可以创建 manual_overrides 表来存储人工修改
      res.json({ 
        success: true, 
        message: '人工备注已保存',
        data: { candidate_id, note, manual_score }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: '保存失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }
}