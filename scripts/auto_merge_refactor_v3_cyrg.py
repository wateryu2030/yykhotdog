import os, textwrap, datetime, shutil
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def ensure_dir(p): 
    os.makedirs(os.path.dirname(p), exist_ok=True)

def backup(p):
    if os.path.exists(p):
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.copy2(p, f"{p}.{ts}.bak")
        print(f"🛟 Backup {p}")

FILES = {}

# ---------- 1️⃣ 收入口径 + 平台结算整合（从 cyrg2025） ----------
FILES["etl/steps/06_profit_analysis.py"] = '''
from lib.mssql import fetch_df, get_conn
import pandas as pd

DW = "hotdog2030"
SRC = "cyrg2025"

def calc_profit_daily():
    sql = """
    WITH line_sales AS (
        SELECT
          CONVERT(INT,FORMAT(o.created_at,'yyyyMMdd')) AS date_key,
          o.store_id,
          SUM(oi.total_price) AS line_amount,
          SUM(oi.quantity * ISNULL(p.cost_price,0)) AS cogs_std
        FROM dbo.orders o
        JOIN dbo.order_items oi ON o.id = oi.order_id
        LEFT JOIN dbo.products p ON p.id = oi.product_id
        WHERE o.pay_state = 1
        GROUP BY CONVERT(INT,FORMAT(o.created_at,'yyyyMMdd')), o.store_id
    ),
    order_discount AS (
        SELECT
          CONVERT(INT,FORMAT(created_at,'yyyyMMdd')) AS date_key,
          store_id,
          SUM(ISNULL(couponAmount,0)+ISNULL(discountAmount,0)+ISNULL(molingAmount,0)) AS discount
        FROM dbo.orders WHERE pay_state=1
        GROUP BY CONVERT(INT,FORMAT(created_at,'yyyyMMdd')), store_id
    ),
    offline_pay AS (
        SELECT
          CONVERT(INT,FORMAT(created_at,'yyyyMMdd')) AS date_key,
          store_id,
          SUM(ISNULL(cash,0)+ISNULL(vipAmount,0)+ISNULL(cardAmount,0)) AS net_offline
        FROM dbo.orders WHERE pay_state=1
        GROUP BY CONVERT(INT,FORMAT(created_at,'yyyyMMdd')), store_id
    ),
    platform_net AS (
        SELECT
          CONVERT(INT,FORMAT(PayTime,'yyyyMMdd')) AS date_key,
          ShopId AS store_id,
          SUM(ISNULL(OrderTotal,0)) AS gross_amount,
          SUM(ISNULL(Commission,0)) AS commission,
          SUM(ISNULL(DeliveryFee,0)) AS delivery_fee,
          SUM(ISNULL(PlatformSubsidy,0)) AS subsidy,
          SUM(ISNULL(OrderTotal,0)-ISNULL(Commission,0)-ISNULL(DeliveryFee,0)+ISNULL(PlatformSubsidy,0)) AS net_platform
        FROM cyrg2025.dbo.PlatformSettle
        WHERE IsValid=1
        GROUP BY CONVERT(INT,FORMAT(PayTime,'yyyyMMdd')),ShopId
    ),
    inventory_cost AS (
        SELECT store_id, CONVERT(INT,FORMAT(date,'yyyyMMdd')) AS date_key,
               SUM(total_cost) AS cogs_mv
        FROM cyrg2025.dbo.InventoryOut
        WHERE delflag=0
        GROUP BY store_id, CONVERT(INT,FORMAT(date,'yyyyMMdd'))
    )
    SELECT
      s.date_key,
      s.store_id,
      (s.line_amount - ISNULL(d.discount,0)) AS revenue_gl,
      ISNULL(i.cogs_mv, s.cogs_std) AS cogs,
      ISNULL(off.net_offline,0)+ISNULL(p.net_platform,0) AS net_receipt_total,
      CASE WHEN i.cogs_mv IS NOT NULL THEN 'moving_avg' ELSE 'standard' END AS cost_source
    FROM line_sales s
    LEFT JOIN order_discount d ON d.date_key=s.date_key AND d.store_id=s.store_id
    LEFT JOIN offline_pay off ON off.date_key=s.date_key AND off.store_id=s.store_id
    LEFT JOIN platform_net p ON p.date_key=s.date_key AND p.store_id=s.store_id
    LEFT JOIN inventory_cost i ON i.date_key=s.date_key AND i.store_id=s.store_id
    """
    return fetch_df(sql, DW)

def upsert(df):
    if df.empty: return
    with get_conn(DW) as conn:
        cur = conn.cursor()
        for _, r in df.iterrows():
            cur.execute("""
MERGE dbo.fact_profit_daily AS T
USING (SELECT ? AS date_key, ? AS store_id) AS S
ON (T.date_key=S.date_key AND T.store_id=S.store_id)
WHEN MATCHED THEN UPDATE SET revenue=?, cogs=?, operating_exp=ISNULL(T.operating_exp,0)
WHEN NOT MATCHED THEN INSERT(date_key,store_id,revenue,cogs,operating_exp)
VALUES(?,?,?, ?,0);
""", int(r.date_key), int(r.store_id),
     float(r.revenue_gl or 0), float(r.cogs or 0),
     int(r.date_key), int(r.store_id), float(r.revenue_gl or 0), float(r.cogs or 0))
        conn.commit()

def main():
    df = calc_profit_daily()
    upsert(df)

if __name__ == "__main__":
    main()
'''

# ---------- 2️⃣ 对账视图（前端展示按订单创建日） ----------
FILES["database/hotdog2030_vw_revenue_reconciliation.sql"] = '''
IF OBJECT_ID('dbo.vw_revenue_reconciliation','V') IS NOT NULL DROP VIEW dbo.vw_revenue_reconciliation;
GO
CREATE VIEW dbo.vw_revenue_reconciliation AS
SELECT
  fp.date_key,
  fp.store_id,
  s.store_name,
  fp.revenue AS revenue_gl,
  fp.cogs,
  fp.operating_exp,
  (fp.revenue - ISNULL(fp.cogs,0)) AS gross_profit,
  (fp.revenue - ISNULL(fp.cogs,0) - ISNULL(fp.operating_exp,0)) AS net_profit,
  fp.revenue - ISNULL(fp.cogs,0) AS gross_profit,
  fp.revenue - ISNULL(fp.cogs,0) - ISNULL(fp.operating_exp,0) AS net_profit,
  ISNULL(fp.revenue,0) AS revenue,
  ISNULL(fp.operating_exp,0) AS operating_exp,
  ISNULL(fp.revenue - fp.cogs - fp.operating_exp,0) AS profit,
  ISNULL(nr.net_receipt_total,0) AS net_receipt_total,
  fp.revenue - ISNULL(nr.net_receipt_total,0) AS diff_to_net,
  fp.date_key AS display_date, -- 前端展示使用
  fp.cost_source
FROM dbo.fact_profit_daily fp
JOIN dbo.stores s ON s.id = fp.store_id
LEFT JOIN (
  SELECT
    CONVERT(INT,FORMAT(created_at,'yyyyMMdd')) AS date_key,
    store_id,
    SUM(ISNULL(cash,0)+ISNULL(vipAmount,0)+ISNULL(cardAmount,0)) AS net_receipt_total
  FROM dbo.orders
  WHERE pay_state=1
  GROUP BY CONVERT(INT,FORMAT(created_at,'yyyyMMdd')),store_id
) nr ON nr.date_key=fp.date_key AND nr.store_id=fp.store_id;
GO
'''

# ---------- 3️⃣ 告警（口径同步 + 前端日期） ----------
FILES["etl/steps/11_alerts_detect.py"] = '''
from lib.mssql import fetch_df, get_conn
import pandas as pd
from datetime import datetime, timedelta

DW = "hotdog2030"
THR_REVENUE = 1000
THR_WOW = -0.2
THR_GM = 0.45
THR_NETIN = -0.25

def week_shift(dk, n=1):
    d = datetime.strptime(str(dk), '%Y%m%d')
    return int((d - timedelta(days=7*n)).strftime('%Y%m%d'))

def pct(a, b):
    return None if b in (0, None) else (a-b)/b

def load():
    return fetch_df("""
    SELECT date_key,store_id,revenue_gl,gross_profit,net_profit,
    CASE WHEN revenue_gl>0 THEN (gross_profit/revenue_gl) END AS gross_margin,
    net_receipt_total FROM vw_revenue_reconciliation""", DW)

def detect(df):
    out = []
    idx = df.set_index(['store_id', 'date_key'])
    for (st, dk), r in idx.iterrows():
        rev = float(r.revenue_gl or 0)
        if rev < THR_REVENUE: continue
        wow = week_shift(dk, 1)
        if (st, wow) in idx.index:
            base = idx.loc[(st, wow)]
            dp = pct(rev, base.revenue_gl)
            if dp is not None and dp <= THR_WOW:
                out.append(dict(date_key=dk, store_id=st, alert_type='WOW_DROP', metric='revenue', delta_pct=dp, message=f'营收环比下降 {dp:.1%}'))
        gm = r.gross_margin
        if gm is not None and gm <= THR_GM:
            out.append(dict(date_key=dk, store_id=st, alert_type='GROSS_LOW', metric='gross_margin', delta_pct=None, message=f'毛利率低于 {THR_GM*100:.0f}%'))
        if (st, wow) in idx.index:
            base = idx.loc[(st, wow)]
            dp = pct(r.net_receipt_total, base.net_receipt_total)
            if dp is not None and dp <= THR_NETIN:
                out.append(dict(date_key=dk, store_id=st, alert_type='NETIN_DROP', metric='net_receipt_total', delta_pct=dp, message=f'到手净额环比下降 {dp:.1%}'))
    return pd.DataFrame(out)

def write(df):
    if df.empty: return
    with get_conn(DW) as conn:
        cur = conn.cursor()
        for _, a in df.iterrows():
            cur.execute("""
INSERT INTO fact_alerts(date_key,store_id,alert_type,metric,delta_pct,message,severity)
VALUES(?,?,?,?,?,?,2)""", int(a.date_key), int(a.store_id), a.alert_type, a.metric, a.delta_pct, a.message)
        conn.commit()

def main():
    df = load()
    out = detect(df)
    write(out)

if __name__ == "__main__":
    main()
'''

def main():
    for rel, content in FILES.items():
        path = os.path.join(BASE, rel)
        ensure_dir(path)
        backup(path)
        with open(path, "w", encoding="utf-8") as f:
            f.write(textwrap.dedent(content).lstrip("\n"))
        print(f"✅ Wrote {rel}")
    print("\n🎯 auto_merge_refactor_v3_cyrg 完成：已集成平台净额/成本来源/口径统一")
    print("➡ 运行顺序：")
    print("1️⃣ SSMS 执行 database/hotdog2030_vw_revenue_reconciliation.sql")
    print("2️⃣ python etl/steps/06_profit_analysis.py")
    print("3️⃣ python etl/steps/11_alerts_detect.py")
    print("前端驾驶舱按 date_key（订单创建日）展示指标")

if __name__ == "__main__":
    main()