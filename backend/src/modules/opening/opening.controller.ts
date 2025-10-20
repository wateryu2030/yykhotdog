import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class OpeningController {
  async list(req: Request, res: Response) {
    const rows = await sequelize.query(`
      SELECT p.*, s.total_score, s.city AS candidate_city
      FROM opening_pipeline p
      LEFT JOIN fact_site_score s ON s.candidate_id=p.candidate_id
      ORDER BY p.created_at DESC
    `, { type: QueryTypes.SELECT });
    res.json({ rows });
  }

  async add(req: Request, res: Response) {
    const { candidate_id, city, expected_open_date, owner, note } = req.body;
    const [result]: any = await sequelize.query(`
      INSERT INTO opening_pipeline (candidate_id, city, expected_open_date, owner, note)
      OUTPUT INSERTED.*
      VALUES (${candidate_id}, ${city ? `'${city}'`:'NULL'}, ${expected_open_date? `'${expected_open_date}'`:'NULL'}, ${owner?`'${owner}'`:'NULL'}, ${note?`'${note}'`:'NULL'})
    `, { type: QueryTypes.INSERT });
    res.json({ ok: true, data: result });
  }

  async tasks(req: Request, res: Response) {
    const { pipeline_id } = req.query as any;
    const rows = await sequelize.query(`SELECT * FROM opening_task WHERE pipeline_id=${Number(pipeline_id)}`, { type: QueryTypes.SELECT });
    res.json({ rows });
  }
}
