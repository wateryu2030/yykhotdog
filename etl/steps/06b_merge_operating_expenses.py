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