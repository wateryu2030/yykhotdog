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