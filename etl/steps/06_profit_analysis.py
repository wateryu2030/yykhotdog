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
          SUM(ISNULL(couponAmount,0)+ISNULL(discountAmount,0)) AS discount
        FROM dbo.orders WHERE pay_state=1
        GROUP BY CONVERT(INT,FORMAT(created_at,'yyyyMMdd')), store_id
    ),
    offline_payments AS (
        SELECT
          CONVERT(INT,FORMAT(created_at,'yyyyMMdd')) AS date_key,
          store_id,
          SUM(ISNULL(cash,0)+ISNULL(vipAmount,0)+ISNULL(cardAmount,0)) AS net_offline
        FROM dbo.orders WHERE pay_state=1
        GROUP BY CONVERT(INT,FORMAT(created_at,'yyyyMMdd')), store_id
    )
    SELECT
      s.date_key,
      s.store_id,
      (s.line_amount - ISNULL(d.discount,0)) AS revenue_gl,
      s.cogs_std AS cogs,
      ISNULL(op.net_offline,0) AS net_receipt_total,
      'standard' AS cost_source
    FROM line_sales s
    LEFT JOIN order_discount d ON d.date_key=s.date_key AND d.store_id=s.store_id
    LEFT JOIN offline_payments op ON op.date_key=s.date_key AND op.store_id=s.store_id
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
