#!/usr/bin/env python3
"""
使用集合化 SQL，一次性从 cyrg2025 / cyrgweixin 的 XcxUser & Orders 表
补齐 hotdog2030.customers 中缺失的客户姓名 / 手机号，并写入不存在的客户。
"""

from textwrap import dedent
import pymssql

RDS_CONFIG = {
    "server": "rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com",
    "port": 1433,
    "user": "hotdog",
    "password": "Zhkj@62102218",
    "database": "hotdog2030",
}


def run_set_based_backfill():
    name_phone_cte = dedent(
        """
        WITH name_source AS (
            SELECT OpenId AS customer_id, NULLIF(LTRIM(RTRIM(NickName)), '') AS value, 1 AS priority
            FROM cyrg2025..XcxUser WITH (NOLOCK)
            UNION ALL
            SELECT OpenId AS customer_id, NULLIF(LTRIM(RTRIM(NickName)), '') AS value, 2 AS priority
            FROM cyrg2025..XcxUser11 WITH (NOLOCK)
            UNION ALL
            SELECT OpenId AS customer_id, NULLIF(LTRIM(RTRIM(NickName)), '') AS value, 1 AS priority
            FROM cyrgweixin..XcxUser WITH (NOLOCK)
        ),
        phone_source AS (
            SELECT OpenId AS customer_id, NULLIF(LTRIM(RTRIM(Tel)), '') AS value, 1 AS priority
            FROM cyrg2025..XcxUser WITH (NOLOCK)
            UNION ALL
            SELECT OpenId AS customer_id, NULLIF(LTRIM(RTRIM(Tel)), '') AS value, 2 AS priority
            FROM cyrg2025..XcxUser11 WITH (NOLOCK)
            UNION ALL
            SELECT OpenId AS customer_id, NULLIF(LTRIM(RTRIM(Tel)), '') AS value, 1 AS priority
            FROM cyrgweixin..XcxUser WITH (NOLOCK)
            UNION ALL
            SELECT openId AS customer_id, NULLIF(LTRIM(RTRIM(vipTel)), '') AS value, 5 AS priority
            FROM cyrg2025..Orders WITH (NOLOCK)
            UNION ALL
            SELECT openId AS customer_id, NULLIF(LTRIM(RTRIM(vipTel)), '') AS value, 5 AS priority
            FROM cyrgweixin..Orders WITH (NOLOCK)
        ),
        best_name AS (
            SELECT customer_id, value AS best_name
            FROM (
                SELECT customer_id, value,
                       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY priority) AS rn
                FROM name_source
                WHERE customer_id IS NOT NULL AND customer_id <> '' AND value IS NOT NULL AND value <> ''
            ) t
            WHERE rn = 1
        ),
        best_phone AS (
            SELECT customer_id, value AS best_phone
            FROM (
                SELECT customer_id, value,
                       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY priority) AS rn
                FROM phone_source
                WHERE customer_id IS NOT NULL AND customer_id <> '' AND value IS NOT NULL AND value <> ''
            ) t
            WHERE rn = 1
        ),
        final_source AS (
            SELECT
                COALESCE(bn.customer_id, bp.customer_id) AS customer_id,
                bn.best_name,
                bp.best_phone
            FROM best_name bn
            FULL OUTER JOIN best_phone bp ON bn.customer_id = bp.customer_id
            WHERE COALESCE(bn.customer_id, bp.customer_id) IS NOT NULL
        )
        """
    )

    update_sql = name_phone_cte + dedent(
        """
        UPDATE c SET
            customer_name = CASE WHEN (c.customer_name IS NULL OR c.customer_name = '') AND fs.best_name IS NOT NULL
                                 THEN fs.best_name ELSE c.customer_name END,
            phone = CASE WHEN (c.phone IS NULL OR c.phone = '') AND fs.best_phone IS NOT NULL
                         THEN fs.best_phone ELSE c.phone END,
            updated_at = CASE WHEN ((c.customer_name IS NULL OR c.customer_name = '') AND fs.best_name IS NOT NULL)
                               OR ((c.phone IS NULL OR c.phone = '') AND fs.best_phone IS NOT NULL)
                               THEN GETDATE() ELSE c.updated_at END
        FROM customers c
        JOIN final_source fs ON fs.customer_id = c.customer_id
        WHERE ((c.customer_name IS NULL OR c.customer_name = '') AND fs.best_name IS NOT NULL)
           OR ((c.phone IS NULL OR c.phone = '') AND fs.best_phone IS NOT NULL);
        """
    )

    insert_sql = dedent(
        """
        DECLARE @base_id INT = (SELECT ISNULL(MAX(id), 0) FROM customers);
        """
    ) + name_phone_cte + dedent(
        """
        INSERT INTO customers (id, customer_id, customer_name, phone, openid, created_at, updated_at, delflag)
        SELECT
            ROW_NUMBER() OVER (ORDER BY fs.customer_id) + @base_id AS id,
            fs.customer_id,
            COALESCE(fs.best_name, fs.customer_id),
            fs.best_phone,
            fs.customer_id,
            GETDATE(),
            GETDATE(),
            0
        FROM final_source fs
        LEFT JOIN customers c ON c.customer_id = fs.customer_id
        WHERE c.customer_id IS NULL;
        """
    )

    conn = pymssql.connect(**RDS_CONFIG)
    cur = conn.cursor()

    print(">>> Running UPDATE to backfill missing names/phones...")
    cur.execute(update_sql)
    print(f"Updated rows: {cur.rowcount}")
    conn.commit()

    print(">>> Inserting new customers that only存在于源系统...")
    cur.execute(insert_sql)
    print(f"Inserted rows: {cur.rowcount}")
    conn.commit()

    cleanup_sql = [
        """
        UPDATE c
        SET customer_name = NULL
        FROM customers c
        WHERE customer_name IS NOT NULL
          AND (
            customer_name LIKE N'%店长%'
            OR customer_name LIKE N'%经理%'
            OR EXISTS (
                SELECT 1 FROM stores s
                WHERE s.director IS NOT NULL
                  AND LTRIM(RTRIM(s.director)) = LTRIM(RTRIM(c.customer_name))
            )
          );
        """,
        """
        UPDATE c
        SET phone = NULL
        FROM customers c
        WHERE phone IS NOT NULL
          AND (
            LEN(phone) < 6
            OR EXISTS (
                SELECT 1 FROM stores s
                WHERE s.director_phone IS NOT NULL
                  AND LTRIM(RTRIM(s.director_phone)) = LTRIM(RTRIM(c.phone))
            )
          );
        """
    ]

    for sql_stmt in cleanup_sql:
        cur.execute(sql_stmt)
        conn.commit()

    cur.close()
    conn.close()
    print("✅ Set-based backfill complete.")


if __name__ == "__main__":
    run_set_based_backfill()

