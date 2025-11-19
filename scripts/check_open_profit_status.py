"""
Quick diagnostic script to verify store open dates and order profit backfill status.
"""

import pymssql
from contextlib import closing

DB_CONFIG = {
    "server": "rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com",
    "user": "hotdog",
    "password": "Zhkj@62102218",
    "database": "hotdog2030",
}


def fetch_one(cursor, query: str):
    cursor.execute(query)
    return cursor.fetchone()


def fetch_all(cursor, query: str):
    cursor.execute(query)
    return cursor.fetchall()


def main():
    with closing(
        pymssql.connect(
            host=DB_CONFIG["server"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            database=DB_CONFIG["database"],
        )
    ) as conn:
        with closing(conn.cursor(as_dict=True)) as cursor:
            store_summary = fetch_one(
                cursor,
                """
                SELECT 
                    COUNT(*) AS total_stores,
                    SUM(CASE WHEN open_date IS NOT NULL THEN 1 ELSE 0 END) AS stores_with_open_date,
                    MIN(open_date) AS earliest_open_date,
                    MAX(open_date) AS latest_open_date
                FROM stores
                """,
            )

            missing_open = fetch_all(
                cursor,
                """
                SELECT TOP 5 id, store_name
                FROM stores
                WHERE open_date IS NULL
                ORDER BY id
                """,
            )

            order_summary = fetch_one(
                cursor,
                """
                SELECT
                    COUNT(*) AS total_orders,
                    SUM(CASE WHEN total_profit IS NOT NULL THEN 1 ELSE 0 END) AS orders_with_profit,
                    SUM(CASE WHEN total_profit = 0 THEN 1 ELSE 0 END) AS zero_profit_orders
                FROM orders
                """,
            )

            profit_samples = fetch_all(
                cursor,
                """
                SELECT TOP 5 id, store_id, total_amount, total_profit
                FROM orders
                WHERE total_profit IS NOT NULL
                ORDER BY id
                """,
            )

    print("== Store open_date summary == ")
    print(store_summary)
    if missing_open:
        print("Stores missing open_date (top 5):")
        for row in missing_open:
            print(row)
    else:
        print("All stores have open_date populated.")

    print("\n== Order total_profit summary ==")
    print(order_summary)
    print("Sample orders with profit populated:")
    for row in profit_samples:
        print(row)


if __name__ == "__main__":
    main()

