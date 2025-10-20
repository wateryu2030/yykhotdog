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
