import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class SegmentsController {
  top = async (req: Request, res: Response) => {
    const limit = parseInt(String(req.query.limit || 10));
    const rows = await sequelize.query(`
      SELECT TOP ${limit} customer_id, r_score, f_score, m_score, segment_code
      FROM dbo.dim_customer_segment 
      ORDER BY segment_code DESC`, {
      type: QueryTypes.SELECT
    });
    res.json({ success: true, data: rows });
  };
}