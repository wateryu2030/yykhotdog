#!/usr/bin/env python3
"""
直接创建分析层表 - 简化版本
"""
import pyodbc
import os

def create_analysis_tables():
    """创建分析层表"""
    # 连接字符串 - 使用RDS配置
    conn_str = (
        "DRIVER={ODBC Driver 18 for SQL Server};"
        "SERVER=rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com,1433;"
        "DATABASE=hotdog2030;"
        "UID=hotdog;"
        "PWD=Zhkj@62102218;"
        "TrustServerCertificate=yes;"
    )
    
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        print("✅ 数据库连接成功")
        
        # 创建销售聚合视图
        print("创建销售聚合视图...")
        cursor.execute("""
        IF OBJECT_ID('dbo.vw_sales_store_daily','V') IS NOT NULL DROP VIEW dbo.vw_sales_store_daily;
        """)
        
        cursor.execute("""
        CREATE VIEW dbo.vw_sales_store_daily AS
        SELECT
          CONVERT(int, FORMAT(o.created_at, 'yyyyMMdd')) AS date_key,
          o.store_id,
          COUNT(DISTINCT o.id) AS orders_cnt,
          SUM(oi.quantity) AS items_qty,
          SUM(o.total_amount) AS revenue
        FROM dbo.orders o
        JOIN dbo.order_items oi ON oi.order_id = o.id
        GROUP BY CONVERT(int, FORMAT(o.created_at, 'yyyyMMdd')), o.store_id;
        """)
        print("✅ 销售聚合视图创建成功")
        
        # 创建利润事实表
        print("创建利润事实表...")
        cursor.execute("""
        IF OBJECT_ID('dbo.fact_profit_daily','U') IS NOT NULL DROP TABLE dbo.fact_profit_daily;
        """)
        
        cursor.execute("""
        CREATE TABLE dbo.fact_profit_daily (
          date_key int NOT NULL,
          store_id int NOT NULL,
          revenue decimal(18,2) NOT NULL DEFAULT(0),
          cogs decimal(18,2) NOT NULL DEFAULT(0),
          operating_exp decimal(18,2) NOT NULL DEFAULT(0),
          net_profit AS (revenue - cogs - operating_exp) PERSISTED,
          PRIMARY KEY (date_key, store_id)
        );
        """)
        print("✅ 利润事实表创建成功")
        
        # 创建预测表
        print("创建预测表...")
        cursor.execute("""
        IF OBJECT_ID('dbo.fact_forecast_daily','U') IS NOT NULL DROP TABLE dbo.fact_forecast_daily;
        """)
        
        cursor.execute("""
        CREATE TABLE dbo.fact_forecast_daily (
          date_key int NOT NULL,
          store_id int NOT NULL,
          yhat decimal(18,2) NOT NULL,
          yhat_lower decimal(18,2) NULL,
          yhat_upper decimal(18,2) NULL,
          model_name nvarchar(100) NULL,
          created_at datetime2 DEFAULT (sysutcdatetime()),
          PRIMARY KEY (date_key, store_id)
        );
        """)
        print("✅ 预测表创建成功")
        
        # 创建客户分群表
        print("创建客户分群表...")
        cursor.execute("""
        IF OBJECT_ID('dbo.dim_customer_segment','U') IS NOT NULL DROP TABLE dbo.dim_customer_segment;
        """)
        
        cursor.execute("""
        CREATE TABLE dbo.dim_customer_segment (
          customer_id nvarchar(100) NOT NULL,
          r_score tinyint NOT NULL,
          f_score tinyint NOT NULL,
          m_score tinyint NOT NULL,
          segment_code int NOT NULL,
          updated_at datetime2 DEFAULT (sysutcdatetime()),
          PRIMARY KEY (customer_id)
        );
        """)
        print("✅ 客户分群表创建成功")
        
        # 创建选址评分表
        print("创建选址评分表...")
        cursor.execute("""
        IF OBJECT_ID('dbo.fact_site_score','U') IS NOT NULL DROP TABLE dbo.fact_site_score;
        """)
        
        cursor.execute("""
        CREATE TABLE dbo.fact_site_score (
          candidate_id int NOT NULL,
          city nvarchar(100) NULL,
          biz_area nvarchar(200) NULL,
          match_score decimal(9,4) NOT NULL,
          cannibal_score decimal(9,4) NOT NULL,
          total_score decimal(9,4) NOT NULL,
          rationale nvarchar(1000) NULL,
          created_at datetime2 DEFAULT (sysutcdatetime()),
          PRIMARY KEY (candidate_id)
        );
        """)
        print("✅ 选址评分表创建成功")
        
        # 创建KPI视图
        print("创建KPI视图...")
        cursor.execute("""
        IF OBJECT_ID('dbo.vw_kpi_store_daily','V') IS NOT NULL DROP VIEW dbo.vw_kpi_store_daily;
        """)
        
        cursor.execute("""
        CREATE VIEW dbo.vw_kpi_store_daily AS
        SELECT
          s.id AS store_id, s.store_name, s.city, sd.date_key,
          sd.orders_cnt, sd.items_qty, sd.revenue,
          ISNULL(fp.cogs,0) AS cogs, ISNULL(fp.operating_exp,0) AS operating_exp,
          (sd.revenue - ISNULL(fp.cogs,0)) AS gross_profit,
          (sd.revenue - ISNULL(fp.cogs,0) - ISNULL(fp.operating_exp,0)) AS net_profit
        FROM dbo.stores s
        JOIN dbo.vw_sales_store_daily sd ON sd.store_id = s.id
        LEFT JOIN dbo.fact_profit_daily fp ON fp.store_id = s.id AND fp.date_key = sd.date_key;
        """)
        print("✅ KPI门店视图创建成功")
        
        cursor.execute("""
        IF OBJECT_ID('dbo.vw_kpi_city_daily','V') IS NOT NULL DROP VIEW dbo.vw_kpi_city_daily;
        """)
        
        cursor.execute("""
        CREATE VIEW dbo.vw_kpi_city_daily AS
        SELECT
          s.city, sd.date_key,
          SUM(sd.orders_cnt) AS orders_cnt,
          SUM(sd.items_qty) AS items_qty,
          SUM(sd.revenue) AS revenue,
          SUM(ISNULL(fp.cogs,0)) AS cogs,
          SUM(ISNULL(fp.operating_exp,0)) AS operating_exp,
          SUM(sd.revenue - ISNULL(fp.cogs,0)) AS gross_profit,
          SUM(sd.revenue - ISNULL(fp.cogs,0) - ISNULL(fp.operating_exp,0)) AS net_profit
        FROM dbo.stores s
        JOIN dbo.vw_sales_store_daily sd ON sd.store_id = s.id
        LEFT JOIN dbo.fact_profit_daily fp ON fp.store_id = s.id AND fp.date_key = sd.date_key
        GROUP BY s.city, sd.date_key;
        """)
        print("✅ KPI城市视图创建成功")
        
        conn.commit()
        print("🎉 所有分析层对象创建成功!")
        
    except Exception as e:
        print(f"❌ 创建失败: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    create_analysis_tables()
