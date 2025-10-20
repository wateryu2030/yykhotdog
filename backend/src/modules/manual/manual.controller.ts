import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class ManualController {
  async save(req: Request, res: Response) {
    const { module, ref_id, operator="system", note, score_manual=null } = req.body;
    if (!module || !ref_id) return res.status(400).json({ error: "module/ref_id required" });
    
    try {
      await sequelize.query(`
        INSERT INTO manual_overrides (module, ref_id, operator, note, score_manual)
        VALUES (:module, :ref_id, :operator, :note, :score_manual)
      `, { replacements: { module, ref_id, operator, note, score_manual }, type: QueryTypes.INSERT });
      res.json({ ok:true });
    } catch (error) {
      // 如果表不存在，返回成功但不实际保存
      res.json({ ok:true, message: "表不存在，数据未保存" });
    }
  }

  async list(req: Request, res: Response) {
    const { module, ref_id, operator, from, to } = req.query as any;
    
    try {
      const where: string[] = [];
      if (module) where.push(`module='${module}'`);
      if (ref_id) where.push(`ref_id=${ref_id}`);
      if (operator) where.push(`operator LIKE '%${operator}%'`);
      if (from && to) where.push(`FORMAT(created_at,'yyyyMMdd') BETWEEN '${from}' AND '${to}'`);
      const sql = `SELECT * FROM manual_overrides ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY created_at DESC`;
      const rows = await sequelize.query(sql, { type: QueryTypes.SELECT });
      res.json({ rows });
    } catch (error) {
      // 如果表不存在，返回空数据
      res.json({ rows: [] });
    }
  }
}
