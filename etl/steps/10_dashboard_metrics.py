"""
ETL步骤10: 仪表板指标聚合
生成各城市/门店KPI聚合视图
"""
import sys
import os
import pandas as pd
import numpy as np
import datetime as dt
from pathlib import Path

# 添加lib路径
sys.path.append(str(Path(__file__).parent.parent))
from lib.mssql import fetch_df, to_sql, get_table_count, execute_sql
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_dashboard_views():
    """创建仪表板视图"""
    logger.info("📊 开始创建仪表板视图...")
    
    # 城市级别KPI视图
    city_kpi_sql = """
    CREATE OR ALTER VIEW v_city_kpi AS
    SELECT 
        s.city,
        s.province,
        COUNT(DISTINCT s.id) as store_count,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(DISTINCT o.customer_id) as unique_customers,
        SUM(o.total_amount) / COUNT(DISTINCT s.id) as revenue_per_store,
        COUNT(o.id) / COUNT(DISTINCT s.id) as orders_per_store,
        GETDATE() as report_date
    FROM stores s
    LEFT JOIN orders o ON s.id = o.store_id
    WHERE o.created_at >= DATEADD(month, -12, GETDATE())
    GROUP BY s.city, s.province
    """
    
    # 门店级别KPI视图
    store_kpi_sql = """
    CREATE OR ALTER VIEW v_store_kpi AS
    SELECT 
        s.id as store_id,
        s.store_name,
        s.city,
        s.province,
        s.district,
        s.rent_amount,
        s.area,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(DISTINCT o.customer_id) as unique_customers,
        COUNT(o.id) / NULLIF(DATEDIFF(day, MIN(o.created_at), MAX(o.created_at)), 0) as daily_orders,
        SUM(o.total_amount) / NULLIF(s.area, 0) as revenue_per_sqm,
        SUM(o.total_amount) / NULLIF(s.rent_amount, 0) as revenue_rent_ratio,
        GETDATE() as report_date
    FROM stores s
    LEFT JOIN orders o ON s.id = o.store_id
    WHERE o.created_at >= DATEADD(month, -12, GETDATE())
    GROUP BY s.id, s.store_name, s.city, s.province, s.district, s.rent_amount, s.area
    """
    
    # 产品级别KPI视图
    product_kpi_sql = """
    CREATE OR ALTER VIEW v_product_kpi AS
    SELECT 
        p.id as product_id,
        p.product_name,
        p.category_id,
        p.sale_price,
        p.cost_price,
        p.profit_margin,
        COUNT(oi.id) as total_sales,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue,
        AVG(oi.price) as avg_sale_price,
        COUNT(DISTINCT o.store_id) as store_count,
        COUNT(DISTINCT o.customer_id) as customer_count,
        GETDATE() as report_date
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE o.created_at >= DATEADD(month, -12, GETDATE())
    GROUP BY p.id, p.product_name, p.category_id, p.sale_price, p.cost_price, p.profit_margin
    """
    
    # 客户级别KPI视图
    customer_kpi_sql = """
    CREATE OR ALTER VIEW v_customer_kpi AS
    SELECT 
        c.id as customer_id,
        c.customer_name,
        c.phone,
        c.city,
        c.province,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order_value,
        MIN(o.created_at) as first_order_date,
        MAX(o.created_at) as last_order_date,
        DATEDIFF(day, MAX(o.created_at), GETDATE()) as days_since_last_order,
        COUNT(DISTINCT o.store_id) as store_count,
        GETDATE() as report_date
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id
    WHERE o.created_at >= DATEADD(month, -12, GETDATE())
    GROUP BY c.id, c.customer_name, c.phone, c.city, c.province
    """
    
    # 时间序列KPI视图
    time_series_kpi_sql = """
    CREATE OR ALTER VIEW v_time_series_kpi AS
    SELECT 
        DATEPART(year, o.created_at) as year,
        DATEPART(month, o.created_at) as month,
        DATEPART(quarter, o.created_at) as quarter,
        s.city,
        s.province,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(DISTINCT o.customer_id) as unique_customers,
        COUNT(DISTINCT o.store_id) as active_stores,
        GETDATE() as report_date
    FROM orders o
    JOIN stores s ON o.store_id = s.id
    WHERE o.created_at >= DATEADD(month, -24, GETDATE())
    GROUP BY 
        DATEPART(year, o.created_at),
        DATEPART(month, o.created_at),
        DATEPART(quarter, o.created_at),
        s.city, s.province
    """
    
    # 执行视图创建
    views = [
        ("城市KPI视图", city_kpi_sql),
        ("门店KPI视图", store_kpi_sql),
        ("产品KPI视图", product_kpi_sql),
        ("客户KPI视图", customer_kpi_sql),
        ("时间序列KPI视图", time_series_kpi_sql)
    ]
    
    for view_name, sql in views:
        try:
            execute_sql(sql, "hotdog2030")
            logger.info(f"✅ {view_name}创建成功")
        except Exception as e:
            logger.error(f"❌ {view_name}创建失败: {str(e)}")

def create_summary_metrics():
    """创建汇总指标表"""
    logger.info("📊 开始创建汇总指标...")
    
    # 获取总体指标
    summary_sql = """
    SELECT 
        COUNT(DISTINCT s.id) as total_stores,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(DISTINCT o.customer_id) as total_customers,
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT s.city) as total_cities,
        GETDATE() as report_date
    FROM stores s
    LEFT JOIN orders o ON s.id = o.store_id
    LEFT JOIN products p ON 1=1
    WHERE o.created_at >= DATEADD(month, -12, GETDATE())
    """
    
    df_summary = fetch_df(summary_sql, "hotdog2030")
    
    if not df_summary.empty:
        # 创建汇总指标表
        create_table_sql = """
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='dashboard_summary' AND xtype='U')
        CREATE TABLE dashboard_summary (
            id int IDENTITY(1,1) PRIMARY KEY,
            total_stores int,
            total_orders int,
            total_revenue decimal(18,2),
            avg_order_value decimal(18,2),
            total_customers int,
            total_products int,
            total_cities int,
            report_date datetime2,
            created_at datetime2 DEFAULT GETDATE()
        )
        """
        
        execute_sql(create_table_sql, "hotdog2030")
        
        # 写入汇总数据
        success = to_sql(df_summary, "dbo.dashboard_summary", "hotdog2030", if_exists='append')
        
        if success:
            logger.info("✅ 汇总指标创建成功")
        else:
            logger.error("❌ 汇总指标创建失败")

def main():
    """主函数"""
    logger.info("🚀 开始ETL步骤10: 仪表板指标聚合")
    
    try:
        # 创建仪表板视图
        create_dashboard_views()
        
        # 创建汇总指标
        create_summary_metrics()
        
        logger.info("🎉 ETL步骤10完成! 仪表板指标聚合完成")
        
        # 输出可用视图列表
        logger.info("📊 可用的仪表板视图:")
        logger.info("   - v_city_kpi: 城市级别KPI")
        logger.info("   - v_store_kpi: 门店级别KPI")
        logger.info("   - v_product_kpi: 产品级别KPI")
        logger.info("   - v_customer_kpi: 客户级别KPI")
        logger.info("   - v_time_series_kpi: 时间序列KPI")
        logger.info("   - dashboard_summary: 汇总指标表")
        
    except Exception as e:
        logger.error(f"❌ ETL步骤10执行失败: {str(e)}")
        raise

if __name__ == "__main__":
    main()
