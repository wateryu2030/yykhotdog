import os, textwrap

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# --- 文件内容模板（我已为你嵌入关键脚本） ---
FILES = {
    "etl/lib/mssql.py": '''
import os, pandas as pd, pyodbc

def get_conn(db_name=None):
    conn_str = (
        "DRIVER={ODBC Driver 17 for SQL Server};"
        f"SERVER={os.getenv('MSSQL_HOST','localhost')},{os.getenv('MSSQL_PORT','1433')};"
        f"DATABASE={db_name};UID={os.getenv('MSSQL_USER','sa')};PWD={os.getenv('MSSQL_PASS','Passw0rd')};"
    )
    return pyodbc.connect(conn_str)

def fetch_df(sql, db):
    with get_conn(db) as conn:
        return pd.read_sql(sql, conn)

def to_sql(df, table, db, if_exists='append'):
    if df.empty: return
    with get_conn(db) as conn:
        cursor = conn.cursor()
        cols = ",".join(df.columns)
        q = ",".join(["?"]*len(df.columns))
        for _,r in df.iterrows():
            cursor.execute(f"INSERT INTO {table} ({cols}) VALUES ({q})", tuple(r))
        conn.commit()
''',

    "etl/steps/06b_merge_operating_expenses.py": '''
from lib.mssql import fetch_df, get_conn

DW = "hotdog2030"

def rollup_expenses():
    sql = "SELECT date_key, store_id, SUM(amount) AS operating_exp FROM dbo.operating_expense_import GROUP BY date_key, store_id"
    return fetch_df(sql, DW)

def upsert(op):
    if op.empty: return
    with get_conn(DW) as conn:
        cur = conn.cursor()
        for _,r in op.iterrows():
            cur.execute("""
MERGE dbo.fact_profit_daily AS T
USING (SELECT ? AS date_key, ? AS store_id) AS S
ON (T.date_key=S.date_key AND T.store_id=S.store_id)
WHEN MATCHED THEN UPDATE SET operating_exp=?
WHEN NOT MATCHED THEN INSERT (date_key, store_id, revenue, cogs, operating_exp)
VALUES (?, ?, 0, 0, ?);
""", int(r['date_key']), int(r['store_id']), float(r['operating_exp']),
     int(r['date_key']), int(r['store_id']), float(r['operating_exp']))
        conn.commit()

def main():
    op = rollup_expenses()
    upsert(op)

if __name__ == "__main__":
    main()
''',

    "etl/steps/11_alerts_detect.py": '''
from lib.mssql import fetch_df, get_conn
import pandas as pd
from datetime import datetime, timedelta

DW = "hotdog2030"

def pct_change(cur, base):
    if base == 0 or base is None: return None
    return (cur - base) / base

def week_shift(date_key, weeks=1):
    d = datetime.strptime(str(date_key), "%Y%m%d")
    return int((d - timedelta(days=7*weeks)).strftime("%Y%m%d"))

def detect_alerts():
    sql = "SELECT store_id, date_key, revenue, (revenue-ISNULL(cogs,0)) AS gross_profit, (revenue-ISNULL(cogs,0)-ISNULL(operating_exp,0)) AS net_profit FROM vw_kpi_store_daily"
    df = fetch_df(sql, DW)
    alerts = []
    idx = df.set_index(['store_id','date_key'])
    for (store, date_key), row in idx.iterrows():
        wow_key = week_shift(date_key, 1)
        if (store, wow_key) in idx.index:
            base = idx.loc[(store, wow_key)]
            delta = pct_change(row['revenue'], base['revenue'])
            if delta is not None and delta <= -0.2:
                alerts.append({
                    'date_key': date_key, 'store_id': store, 'alert_type':'WOW_DROP',
                    'metric':'revenue','current_val':row['revenue'],
                    'baseline_val':base['revenue'],'delta_pct':delta,
                    'message':f"本周营收下降 {delta:.1%}"
                })
    return pd.DataFrame(alerts)

def main():
    df = detect_alerts()
    if df.empty: return
    with get_conn(DW) as conn:
        cur = conn.cursor()
        for _,a in df.iterrows():
            cur.execute("INSERT INTO fact_alerts (date_key,store_id,alert_type,metric,current_val,baseline_val,delta_pct,message) VALUES (?,?,?,?,?,?,?,?)",
                int(a['date_key']),int(a['store_id']),a['alert_type'],a['metric'],a['current_val'],a['baseline_val'],a['delta_pct'],a['message'])
        conn.commit()

if __name__ == "__main__":
    main()
''',

    "etl/steps/09b_site_selection_gravity.py": '''
from lib.mssql import fetch_df, to_sql
import pandas as pd, math, re

WX = "cyrgweixin"
DW = "hotdog2030"

def haversine(lat1,lng1,lat2,lng2):
    R=6371.0
    phi1,phi2=math.radians(lat1),math.radians(lat2)
    dphi=math.radians(lat2-lat1)
    dl=math.radians(lng2-lng1)
    a=math.sin(dphi/2)**2+math.cos(phi1)*math.cos(phi2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(a))

def parse_location(s):
    if not s: return None
    nums=re.findall(r"-?\\d+\\.\\d+", s)
    if len(nums)>=2:
        a,b=map(float,nums[:2])
        lon,lat=(a,b) if abs(a)>abs(b) else (b,a)
        if 18<=abs(lat)<=54 and 72<=abs(lon)<=135:
            return lat,lon
    return None

def load_candidates():
    sql="SELECT Id AS candidate_id, ShopName AS name, ShopAddress AS address, location FROM Rg_SeekShop WHERE Delflag=0"
    df=fetch_df(sql,WX)
    df['lat'],df['lng']=zip(*[(parse_location(s) or (None,None)) for s in df['location'].fillna('')])
    return df

def load_stores_with_perf():
    sql="SELECT s.id AS store_id,s.city,s.longitude,s.latitude,AVG(d.revenue) AS avg_rev FROM dbo.stores s LEFT JOIN dbo.vw_sales_store_daily d ON d.store_id=s.id GROUP BY s.id,s.city,s.longitude,s.latitude"
    return fetch_df(sql,DW)

def main():
    cand=load_candidates();stores=load_stores_with_perf();rows=[]
    for _,c in cand.iterrows():
        if pd.notna(c.lat) and pd.notna(c.lng):
            cannibal=sum(stores.apply(lambda s:(s.avg_rev or 0)/(max(haversine(c.lat,c.lng,s.latitude,s.longitude),0.1)**2) if pd.notna(s.latitude) else 0,axis=1))
        else: cannibal=len(stores)
        match=stores['avg_rev'].mean() if 'avg_rev' in stores else 0
        rows.append({'candidate_id':int(c.candidate_id),'city':c.address[:2] if isinstance(c.address,str) else None,
                     'match_score':match,'cannibal_score':cannibal})
    df=pd.DataFrame(rows)
    if df.empty: return
    df['match_score']=df['match_score']/df['match_score'].max()
    df['cannibal_score']=df['cannibal_score']/df['cannibal_score'].max()
    df['total_score']=0.6*df['match_score']+0.4*(1-df['cannibal_score'])
    df['rationale']="重力模型选址：营收匹配+蚕食修正"
    to_sql(df[['candidate_id','city','match_score','cannibal_score','total_score','rationale']], 'dbo.fact_site_score', DW, if_exists='replace')

if __name__ == "__main__":
    main()
''',

    "backend/src/modules/metrics/metrics.controller.ts": '''
import { Request, Response } from "express";
import { prisma } from "../../infra/db/prismaClient";

export class MetricsController {
  overview = async (req: Request, res: Response) => {
    const from = parseInt(String(req.query.from||0));
    const to = parseInt(String(req.query.to||99999999));
    const level = (req.query.level || "store") as "store"|"city";
    const view = level === "city" ? "vw_kpi_city_daily" : "vw_kpi_store_daily";
    const rows = await prisma.$queryRawUnsafe(`
      SELECT ${level==="city"?"city":"store_name"}, date_key, SUM(revenue) AS revenue, SUM(net_profit) AS net_profit
      FROM ${view} WHERE date_key BETWEEN ${from} AND ${to}
      GROUP BY ${level==="city"?"city":"store_name"}, date_key ORDER BY date_key DESC`);
    res.json({ level, from, to, rows });
  };
}
''',

    "backend/src/modules/metrics/metrics.routes.ts": '''
import { Router } from "express";
import { MetricsController } from "./metrics.controller";
export const metricsRouter = Router();
const ctl = new MetricsController();
metricsRouter.get("/overview", ctl.overview);
''',

    "backend/src/modules/segments/segments.controller.ts": '''
import { Request, Response } from "express";
import { prisma } from "../../infra/db/prismaClient";

export class SegmentsController {
  top = async (req: Request, res: Response) => {
    const limit = parseInt(String(req.query.limit || 10));
    const rows = await prisma.$queryRawUnsafe(`
      SELECT TOP ${limit} customer_id, r_score, f_score, m_score, segment_code
      FROM dbo.dim_customer_segment 
      ORDER BY segment_code DESC`);
    res.json({ success: true, data: rows });
  };
}
''',

    "backend/src/modules/segments/segments.routes.ts": '''
import { Router } from "express";
import { SegmentsController } from "./segments.controller";
export const segmentsRouter = Router();
const ctl = new SegmentsController();
segmentsRouter.get("/top", ctl.top);
''',

    "backend/src/modules/site/site.controller.ts": '''
import { Request, Response } from "express";
import { prisma } from "../../infra/db/prismaClient";

export class SiteController {
  scores = async (req: Request, res: Response) => {
    const limit = parseInt(String(req.query.limit || 10));
    const rows = await prisma.$queryRawUnsafe(`
      SELECT TOP ${limit} candidate_id, city, match_score, cannibal_score, total_score, rationale
      FROM dbo.fact_site_score 
      ORDER BY total_score DESC`);
    res.json({ success: true, data: rows });
  };
}
''',

    "backend/src/modules/site/site.routes.ts": '''
import { Router } from "express";
import { SiteController } from "./site.controller";
export const siteRouter = Router();
const ctl = new SiteController();
siteRouter.get("/scores", ctl.scores);
''',

    "backend/src/modules/alerts/alerts.controller.ts": '''
import { Request, Response } from "express";
import { prisma } from "../../infra/db/prismaClient";

export class AlertsController {
  list = async (req: Request, res: Response) => {
    const limit = parseInt(String(req.query.limit || 10));
    const rows = await prisma.$queryRawUnsafe(`
      SELECT TOP ${limit} date_key, store_id, alert_type, metric, current_val, baseline_val, delta_pct, message
      FROM dbo.fact_alerts 
      ORDER BY date_key DESC`);
    res.json({ success: true, data: rows });
  };
}
''',

    "backend/src/modules/alerts/alerts.routes.ts": '''
import { Router } from "express";
import { AlertsController } from "./alerts.controller";
export const alertsRouter = Router();
const ctl = new AlertsController();
alertsRouter.get("/", ctl.list);
''',

    "backend/src/modules/index.ts": '''
/**
 * 业务模块统一导出
 * 包含：指标分析、客户分群、选址评分、异常告警等核心业务模块
 */

// 指标分析模块
export { metricsRouter } from './metrics/metrics.routes';
export { MetricsController } from './metrics/metrics.controller';

// 客户分群模块
export { segmentsRouter } from './segments/segments.routes';
export { SegmentsController } from './segments/segments.controller';

// 选址评分模块
export { siteRouter } from './site/site.routes';
export { SiteController } from './site/site.controller';

// 异常告警模块
export { alertsRouter } from './alerts/alerts.routes';
export { AlertsController } from './alerts/alerts.controller';
''',

    "hotdog2030_schema_updates.sql": '''
-- 期间费用导入表
IF OBJECT_ID('dbo.operating_expense_import','U') IS NULL
CREATE TABLE dbo.operating_expense_import (
  id int IDENTITY(1,1) PRIMARY KEY,
  date_key int NOT NULL,
  store_id int NOT NULL,
  category nvarchar(50) NOT NULL,
  amount decimal(18,2) NOT NULL,
  description nvarchar(200) NULL,
  created_at datetime2 DEFAULT sysutcdatetime()
);

-- 房租种子化存储过程
IF OBJECT_ID('dbo.sp_seed_rent_daily','P') IS NOT NULL DROP PROCEDURE dbo.sp_seed_rent_daily;
GO
CREATE PROCEDURE dbo.sp_seed_rent_daily
  @year int,
  @month int
AS
BEGIN
  DECLARE @date_key int = @year * 10000 + @month * 100 + 1;
  DECLARE @end_date int = @year * 10000 + @month * 100 + 31;
  
  WHILE @date_key <= @end_date
  BEGIN
    INSERT INTO dbo.operating_expense_import (date_key, store_id, category, amount, description)
    SELECT @date_key, id, 'rent', rent_amount, '日房租费用'
    FROM dbo.stores 
    WHERE delflag = 0 AND rent_amount > 0;
    
    SET @date_key = @date_key + 1;
  END
END;
GO

-- 异常告警表
IF OBJECT_ID('dbo.fact_alerts','U') IS NULL
CREATE TABLE dbo.fact_alerts (
  id int IDENTITY(1,1) PRIMARY KEY,
  date_key int NOT NULL,
  store_id int NOT NULL,
  alert_type nvarchar(50) NOT NULL,
  metric nvarchar(50) NOT NULL,
  current_val decimal(18,2) NOT NULL,
  baseline_val decimal(18,2) NOT NULL,
  delta_pct decimal(9,4) NOT NULL,
  message nvarchar(500) NOT NULL,
  created_at datetime2 DEFAULT sysutcdatetime()
);

-- 选址评分表
IF OBJECT_ID('dbo.fact_site_score','U') IS NULL
CREATE TABLE dbo.fact_site_score (
  candidate_id int NOT NULL PRIMARY KEY,
  city nvarchar(100) NULL,
  biz_area nvarchar(200) NULL,
  match_score decimal(9,4) NOT NULL,
  cannibal_score decimal(9,4) NOT NULL,
  total_score decimal(9,4) NOT NULL,
  rationale nvarchar(1000) NULL,
  created_at datetime2 DEFAULT sysutcdatetime()
);

-- 差评统计导入表
IF OBJECT_ID('dbo.review_stats_import','U') IS NULL
CREATE TABLE dbo.review_stats_import (
  id int IDENTITY(1,1) PRIMARY KEY,
  date_key int NOT NULL,
  store_id int NOT NULL,
  total_reviews int NOT NULL DEFAULT(0),
  negative_reviews int NOT NULL DEFAULT(0),
  negative_rate decimal(5,2) NOT NULL DEFAULT(0),
  created_at datetime2 DEFAULT sysutcdatetime()
);
''',

    "backend_route_injection.ts": '''
// 自动注入到 backend/src/index.ts 的路由代码
// 在现有的 app.use 路由注册后添加以下代码：

// 新增业务模块API路由
import { metricsRouter, segmentsRouter, siteRouter, alertsRouter } from './modules';

app.use('/api/metrics', metricsRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/site-scores', siteRouter);
app.use('/api/alerts', alertsRouter);
'''
}

def ensure_dir(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)

def write_file(path, content):
    ensure_dir(path)
    with open(path, "w", encoding="utf-8") as f:
        f.write(textwrap.dedent(content).strip())
    print(f"✅ Wrote {path}")

def inject_routes():
    """自动注入路由到 backend/src/index.ts"""
    index_path = os.path.join(BASE, "backend/src/index.ts")
    if not os.path.exists(index_path):
        print("⚠️ backend/src/index.ts not found, skipping route injection")
        return
    
    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 检查是否已经注入过
    if "metricsRouter" in content:
        print("✅ Routes already injected to backend/src/index.ts")
        return
    
    # 添加导入语句
    import_line = "import { metricsRouter, segmentsRouter, siteRouter, alertsRouter } from './modules';"
    if import_line not in content:
        # 在最后一个import后添加
        lines = content.split('\n')
        last_import_idx = -1
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                last_import_idx = i
        
        if last_import_idx >= 0:
            lines.insert(last_import_idx + 1, import_line)
            content = '\n'.join(lines)
    
    # 添加路由注册
    route_lines = [
        "",
        "// 新增业务模块API路由",
        "app.use('/api/metrics', metricsRouter);",
        "app.use('/api/segments', segmentsRouter);",
        "app.use('/api/site-scores', siteRouter);",
        "app.use('/api/alerts', alertsRouter);"
    ]
    
    # 在最后一个app.use后添加
    if "app.use('/api/alerts', alertsRouter);" not in content:
        content += '\n'.join(route_lines)
        
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("✅ Routes injected to backend/src/index.ts")
    else:
        print("✅ Routes already present in backend/src/index.ts")

def main():
    for rel, content in FILES.items():
        write_file(os.path.join(BASE, rel), content)
    
    # 自动注入路由
    inject_routes()
    
    print("\n🎉 All HotDog refactor files written successfully!")
    print("\n📋 Next steps:")
    print("1. Run: docker-compose build backend")
    print("2. Run: docker-compose up -d backend")
    print("3. Test APIs: curl http://localhost:3001/api/metrics/overview")

if __name__ == "__main__":
    main()
