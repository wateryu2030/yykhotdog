import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class SiteController {
  scores = async (req: Request, res: Response) => {
    const limit = parseInt(String(req.query.limit || 10));
    const rows = await sequelize.query(`
      SELECT TOP ${limit} candidate_id, city, match_score, cannibal_score, total_score, rationale
      FROM dbo.fact_site_score 
      ORDER BY total_score DESC`, {
      type: QueryTypes.SELECT
    });
    res.json({ success: true, data: rows });
  };
}