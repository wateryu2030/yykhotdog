import os, textwrap, shutil, datetime
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def ensure_dir(p): os.makedirs(os.path.dirname(p), exist_ok=True)
def backup(p):
    if os.path.exists(p):
        ts=datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.copy2(p, f"{p}.{ts}.bak")
        print(f"🛟 Backup {p}")

FILES = {}

# ========== 1) SQL 视图：销售对比 ==========
FILES["database/vw_sales_comparison.sql"] = r"""
IF OBJECT_ID('dbo.vw_sales_comparison','V') IS NOT NULL DROP VIEW dbo.vw_sales_comparison;
GO
CREATE VIEW dbo.vw_sales_comparison AS
SELECT
  s.city,
  s.id AS store_id,
  s.store_name,
  k.date_key,
  k.orders_cnt,
  k.items_qty,
  k.revenue,
  k.gross_profit,
  k.net_profit,
  CASE WHEN k.revenue > 0 THEN k.gross_profit/k.revenue ELSE 0 END AS gross_margin
FROM dbo.vw_kpi_store_daily k
JOIN dbo.stores s ON s.id = k.store_id;
GO
"""

# ========== 2) SQL 视图：分配结果（示例规则） ==========
FILES["database/vw_allocation_result.sql"] = r"""
/*
示例：按城市权重 + 门店营收权重对集团期间费用进行二次分配。
你也可以在 operating_expense_import 中预先指定类别与比例。
*/
IF OBJECT_ID('dbo.vw_allocation_result','V') IS NOT NULL DROP VIEW dbo.vw_allocation_result;
GO
WITH city_weight AS (
  SELECT s.city, SUM(k.revenue) AS city_revenue
  FROM dbo.vw_kpi_store_daily k
  JOIN dbo.stores s ON s.id=k.store_id
  GROUP BY s.city
),
store_weight AS (
  SELECT s.city, k.store_id, SUM(k.revenue) AS store_revenue
  FROM dbo.vw_kpi_store_daily k
  JOIN dbo.stores s ON s.id=k.store_id
  GROUP BY s.city, k.store_id
),
op_exp AS (
  SELECT date_key, store_id, SUM(operating_exp) AS op
  FROM dbo.fact_profit_daily
  GROUP BY date_key, store_id
)
SELECT
  sw.city,
  sw.store_id,
  CONVERT(int, FORMAT(GETDATE(),'yyyyMMdd')) AS date_key,
  ISNULL(op.op,0) AS base_operating_exp,            -- 已录入的期间费用
  ISNULL(sw.store_revenue,0) AS store_revenue,
  ISNULL(cw.city_revenue,0) AS city_revenue,
  CASE WHEN cw.city_revenue>0 THEN sw.store_revenue/cw.city_revenue ELSE 0 END AS weight_in_city,
  ISNULL(op.op,0) * CASE WHEN cw.city_revenue>0 THEN sw.store_revenue/cw.city_revenue ELSE 0 END AS allocated_expense
FROM store_weight sw
LEFT JOIN city_weight cw ON cw.city=sw.city
LEFT JOIN (
  SELECT store_id, SUM(operating_exp) AS op FROM dbo.fact_profit_daily GROUP BY store_id
) op ON op.store_id=sw.store_id;
GO
"""

# ========== 3) SQL 视图：客群/商品/城市画像 ==========
FILES["database/vw_customer_product_city_profiles.sql"] = r"""
IF OBJECT_ID('dbo.vw_customer_profile','V') IS NOT NULL DROP VIEW dbo.vw_customer_profile;
GO
CREATE VIEW dbo.vw_customer_profile AS
SELECT
  c.customer_id,
  s.store_name,
  MAX(dcs.segment_code) AS segment_code,
  COUNT(DISTINCT o.id) AS orders_cnt,
  SUM(o.total_amount) AS total_spent,
  MIN(CONVERT(int, FORMAT(o.created_at,'yyyyMMdd'))) AS first_date_key,
  MAX(CONVERT(int, FORMAT(o.created_at,'yyyyMMdd'))) AS last_date_key
FROM dbo.customers c
LEFT JOIN dbo.orders o ON o.customer_id=c.customer_id
LEFT JOIN dbo.stores s ON s.id=o.store_id
LEFT JOIN dbo.dim_customer_segment dcs ON dcs.customer_id=c.customer_id
GROUP BY c.customer_id, s.store_name;
GO

IF OBJECT_ID('dbo.vw_product_profile','V') IS NOT NULL DROP VIEW dbo.vw_product_profile;
GO
CREATE VIEW dbo.vw_product_profile AS
SELECT
  p.id AS product_id,
  p.product_name,
  SUM(oi.quantity) AS qty_sold,
  SUM(oi.total_price) AS sales_amount,
  SUM(oi.quantity * ISNULL(p.cost_price,0)) AS cogs,
  CASE WHEN SUM(oi.total_price)>0
       THEN (SUM(oi.total_price)-SUM(oi.quantity*ISNULL(p.cost_price,0))) / SUM(oi.total_price)
       ELSE 0 END AS gross_margin,
  COUNT(DISTINCT o.customer_id) AS buyers_cnt
FROM dbo.order_items oi
JOIN dbo.orders o ON o.id=oi.order_id
JOIN dbo.products p ON p.id=oi.product_id
GROUP BY p.id, p.product_name;
GO

IF OBJECT_ID('dbo.vw_city_profile','V') IS NOT NULL DROP VIEW dbo.vw_city_profile;
GO
CREATE VIEW dbo.vw_city_profile AS
SELECT
  s.city,
  COUNT(DISTINCT s.id) AS stores_cnt,
  SUM(k.revenue) AS revenue,
  SUM(k.net_profit) AS net_profit,
  CASE WHEN SUM(k.revenue)>0 THEN SUM(k.gross_profit)/SUM(k.revenue) ELSE 0 END AS gross_margin,
  AVG(k.orders_cnt) AS avg_orders_per_store
FROM dbo.vw_kpi_store_daily k
JOIN dbo.stores s ON s.id=k.store_id
GROUP BY s.city;
GO
"""

# ========== 4) 后端：选店（含"智能选店"） ==========
FILES["backend/src/modules/siteSelection/siteSelection.controller.ts"] = r"""
import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class SiteSelectionController {
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
    const whereCity = city ? `WHERE f.city='${city}'` : "";
    const rows = await sequelize.query(`
      SELECT TOP 50 f.*, cp.stores_cnt, cp.gross_margin
      FROM fact_site_score f
      LEFT JOIN vw_city_profile cp ON cp.city = f.city
      ${whereCity}
      ORDER BY f.total_score DESC
    `, { type: QueryTypes.SELECT });
    res.json({ city: city||null, minScore, rows: rows.filter((r:any)=>Number(r.total_score)>=Number(minScore)) });
  }
}
"""

FILES["backend/src/modules/siteSelection/siteSelection.routes.ts"] = r"""
import { Router } from "express";
import { SiteSelectionController } from "./siteSelection.controller";

export const siteSelectionRouter = Router();
const ctl = new SiteSelectionController();

siteSelectionRouter.get("/candidates", ctl.candidates);
siteSelectionRouter.get("/ai-suggest", ctl.aiSuggest);
"""

# ========== 5) 后端：开店模块（管道+任务） ==========
FILES["database/opening_pipeline.sql"] = r"""
IF OBJECT_ID('dbo.opening_pipeline','U') IS NULL
CREATE TABLE dbo.opening_pipeline (
  id INT IDENTITY(1,1) PRIMARY KEY,
  candidate_id INT NOT NULL,   -- 对应 fact_site_score.candidate_id
  city NVARCHAR(100) NULL,
  status NVARCHAR(30) NOT NULL DEFAULT('pending'), -- pending|approved|signed|opening|opened|dead
  expected_open_date DATE NULL,
  owner NVARCHAR(50) NULL,
  note NVARCHAR(500) NULL,
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('dbo.opening_task','U') IS NULL
CREATE TABLE dbo.opening_task (
  id INT IDENTITY(1,1) PRIMARY KEY,
  pipeline_id INT NOT NULL,
  task NVARCHAR(100) NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT('todo'), -- todo|doing|done
  due_date DATE NULL,
  assignee NVARCHAR(50) NULL,
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  FOREIGN KEY (pipeline_id) REFERENCES dbo.opening_pipeline(id)
);
GO
"""

FILES["backend/src/modules/opening/opening.controller.ts"] = r"""
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
"""

FILES["backend/src/modules/opening/opening.routes.ts"] = r"""
import { Router } from "express";
import { OpeningController } from "./opening.controller";

export const openingRouter = Router();
const ctl = new OpeningController();

openingRouter.get("/pipeline", ctl.list);
openingRouter.post("/pipeline", ctl.add);
openingRouter.get("/tasks", ctl.tasks);
"""

# ========== 6) 后端：运营/销售对比/分配/画像 ==========
FILES["backend/src/modules/operations/operations.controller.ts"] = r"""
import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class OperationsController {
  async storesKPI(req: Request, res: Response) {
    const { from=0, to=99999999 } = req.query as any;
    const rows = await sequelize.query(`
      SELECT store_id, store_name, date_key, orders_cnt, items_qty, revenue, gross_profit, net_profit
      FROM vw_kpi_store_daily WHERE date_key BETWEEN ${from} AND ${to}
    `, { type: QueryTypes.SELECT });
    res.json({ rows });
  }
}
"""

FILES["backend/src/modules/operations/operations.routes.ts"] = r"""
import { Router } from "express";
import { OperationsController } from "./operations.controller";

export const operationsRouter = Router();
const ctl = new OperationsController();

operationsRouter.get("/stores/kpi", ctl.storesKPI);
"""

FILES["backend/src/modules/sales/sales.controller.ts"] = r"""
import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class SalesController {
  // 支持维度：city | store；支持 period 对比：from/to
  async compare(req: Request, res: Response) {
    const { level='city', from=0, to=99999999 } = req.query as any;
    const view = 'vw_sales_comparison';
    const group = level==='city' ? 'city' : 'store_name';
    const rows = await sequelize.query(`
      SELECT ${group} AS dim, SUM(revenue) AS revenue, SUM(net_profit) AS net_profit,
             CASE WHEN SUM(revenue)>0 THEN SUM(gross_profit)/SUM(revenue) ELSE 0 END AS gross_margin
      FROM ${view} WHERE date_key BETWEEN ${from} AND ${to}
      GROUP BY ${group} ORDER BY revenue DESC
    `, { type: QueryTypes.SELECT });
    res.json({ level, from, to, rows });
  }
}
"""

FILES["backend/src/modules/sales/sales.routes.ts"] = r"""
import { Router } from "express";
import { SalesController } from "./sales.controller";

export const salesRouter = Router();
const ctl = new SalesController();

salesRouter.get("/compare", ctl.compare);
"""

FILES["backend/src/modules/allocation/allocation.controller.ts"] = r"""
import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class AllocationController {
  async result(req: Request, res: Response) {
    const rows = await sequelize.query(`SELECT * FROM vw_allocation_result ORDER BY city`, { type: QueryTypes.SELECT });
    res.json({ rows });
  }
}
"""

FILES["backend/src/modules/allocation/allocation.routes.ts"] = r"""
import { Router } from "express";
import { AllocationController } from "./allocation.controller";

export const allocationRouter = Router();
const ctl = new AllocationController();

allocationRouter.get("/result", ctl.result);
"""

FILES["backend/src/modules/profiles/profiles.controller.ts"] = r"""
import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

export class ProfilesController {
  async customers(req: Request, res: Response) {
    const rows = await sequelize.query(`SELECT TOP 100 * FROM vw_customer_profile ORDER BY total_spent DESC`, { type: QueryTypes.SELECT });
    res.json({ rows });
  }
  async products(req: Request, res: Response) {
    const rows = await sequelize.query(`SELECT TOP 200 * FROM vw_product_profile ORDER BY sales_amount DESC`, { type: QueryTypes.SELECT });
    res.json({ rows });
  }
  async cities(req: Request, res: Response) {
    const rows = await sequelize.query(`SELECT * FROM vw_city_profile ORDER BY revenue DESC`, { type: QueryTypes.SELECT });
    res.json({ rows });
  }
}
"""

FILES["backend/src/modules/profiles/profiles.routes.ts"] = r"""
import { Router } from "express";
import { ProfilesController } from "./profiles.controller";

export const profilesRouter = Router();
const ctl = new ProfilesController();

profilesRouter.get("/customers", ctl.customers);
profilesRouter.get("/products", ctl.products);
profilesRouter.get("/cities", ctl.cities);
"""

# ========== 7) 汇总导出 ==========
FILES["backend/src/modules/index.ts"] = r"""
/**
 * 统一导出业务模块（追加新模块）
 */
export { metricsRouter } from './metrics/metrics.routes';
export { siteRouter } from './site/site.routes';
export { alertsRouter } from './alerts/alerts.routes';
export { segmentsRouter } from './segments/segments.routes';

export { siteSelectionRouter } from './siteSelection/siteSelection.routes';
export { openingRouter } from './opening/opening.routes';
export { operationsRouter } from './operations/operations.routes';
export { salesRouter } from './sales/sales.routes';
export { allocationRouter } from './allocation/allocation.routes';
export { profilesRouter } from './profiles/profiles.routes';
"""

def write(rel, content):
    path = os.path.join(BASE, rel)
    ensure_dir(path); backup(path)
    with open(path, "w", encoding="utf-8") as f:
        f.write(textwrap.dedent(content).lstrip("\n"))
    print(f"✅ Wrote {rel}")

def main():
    for rel, content in FILES.items():
        write(rel, content)
    print("\n🎉 master_v5 写入完成：SQL 视图 + 后端模块已生成/更新")
    print("➡ 下一步：")
    print("1) 在 SSMS 依次执行 /database/*.sql（新视图与开店表）")
    print("2) 重启后端：npm run dev --prefix backend")
    print("3) 前端可直接对接：")
    print("   - /api/site-selection/candidates  /api/site-selection/ai-suggest")
    print("   - /api/opening/pipeline  /api/opening/tasks")
    print("   - /api/operations/stores/kpi")
    print("   - /api/sales/compare?level=city|store&from=YYYYMMDD&to=YYYYMMDD")
    print("   - /api/allocation/result")
    print("   - /api/profiles/customers  /api/profiles/products  /api/profiles/cities")
    print("（所有口径统一：基于 vw_kpi_* + vw_revenue_reconciliation）")

if __name__ == "__main__":
    main()
