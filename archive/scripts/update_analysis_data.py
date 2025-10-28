#!/usr/bin/env python3
"""
改进的数据更新脚本 - 补齐分析表数据
基于现有的hotdog2030数据库数据，填充所有分析层表
"""

import os
import pyodbc
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 数据库连接配置
def get_conn(db_name="hotdog2030"):
    """获取数据库连接"""
    conn_str = (
        "DRIVER={ODBC Driver 18 for SQL Server};"
        f"SERVER={os.getenv('MSSQL_HOST', 'rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com')},{os.getenv('MSSQL_PORT','1433')};"
        f"DATABASE={db_name};UID={os.getenv('MSSQL_USER','hotdog')};PWD={os.getenv('MSSQL_PASS','Zhkj@62102218')};"
        "TrustServerCertificate=yes;"
    )
    return pyodbc.connect(conn_str)

def execute_sql(sql, params=None):
    """执行SQL语句"""
    try:
        with get_conn() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            conn.commit()
            return True
    except Exception as e:
        logger.error(f"SQL执行失败: {e}")
        return False

def fetch_data(sql, params=None):
    """获取数据"""
    try:
        with get_conn() as conn:
            return pd.read_sql(sql, conn, params=params)
    except Exception as e:
        logger.error(f"数据获取失败: {e}")
        return pd.DataFrame()

def update_profit_analysis():
    """更新利润分析数据"""
    logger.info("🔄 开始更新利润分析数据...")
    
    # 计算每日利润数据
    sql = """
    INSERT INTO dbo.fact_profit_daily (date_key, store_id, revenue, cogs, operating_exp)
    SELECT 
        CONVERT(int, FORMAT(o.created_at, 'yyyyMMdd')) AS date_key,
        o.store_id,
        SUM(o.total_amount) AS revenue,
        SUM(ISNULL(oi.quantity * ISNULL(p.cost_price, 0), 0)) AS cogs,
        0 AS operating_exp
    FROM dbo.orders o
    LEFT JOIN dbo.order_items oi ON oi.order_id = o.id
    LEFT JOIN dbo.products p ON p.id = oi.product_id
    WHERE o.created_at IS NOT NULL
    GROUP BY CONVERT(int, FORMAT(o.created_at, 'yyyyMMdd')), o.store_id
    """
    
    if execute_sql(sql):
        # 获取统计信息
        count_sql = "SELECT COUNT(*) FROM dbo.fact_profit_daily"
        with get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(count_sql)
            count = cursor.fetchone()[0]
        logger.info(f"✅ 利润分析数据更新完成: {count:,} 条记录")
        return True
    return False

def update_customer_segmentation():
    """更新客户分群数据"""
    logger.info("🔄 开始更新客户分群数据...")
    
    # 计算RFM数据
    sql = """
    WITH customer_rfm AS (
        SELECT 
            o.customer_id,
            DATEDIFF(day, MAX(o.created_at), GETDATE()) AS recency_days,
            COUNT(*) AS frequency,
            SUM(o.total_amount) AS monetary
        FROM dbo.orders o
        WHERE o.customer_id IS NOT NULL AND o.customer_id != ''
        GROUP BY o.customer_id
    ),
    rfm_scores AS (
        SELECT 
            customer_id,
            recency_days,
            frequency,
            monetary,
            CASE 
                WHEN recency_days <= 30 THEN 5
                WHEN recency_days <= 60 THEN 4
                WHEN recency_days <= 90 THEN 3
                WHEN recency_days <= 180 THEN 2
                ELSE 1
            END AS r_score,
            CASE 
                WHEN frequency >= 20 THEN 5
                WHEN frequency >= 10 THEN 4
                WHEN frequency >= 5 THEN 3
                WHEN frequency >= 2 THEN 2
                ELSE 1
            END AS f_score,
            CASE 
                WHEN monetary >= 1000 THEN 5
                WHEN monetary >= 500 THEN 4
                WHEN monetary >= 200 THEN 3
                WHEN monetary >= 100 THEN 2
                ELSE 1
            END AS m_score
        FROM customer_rfm
    )
    INSERT INTO dbo.dim_customer_segment (customer_id, r_score, f_score, m_score, segment_code)
    SELECT 
        customer_id,
        r_score,
        f_score,
        m_score,
        r_score * 100 + f_score * 10 + m_score AS segment_code
    FROM rfm_scores
    """
    
    if execute_sql(sql):
        # 获取统计信息
        count_sql = "SELECT COUNT(*) FROM dbo.dim_customer_segment"
        with get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(count_sql)
            count = cursor.fetchone()[0]
        logger.info(f"✅ 客户分群数据更新完成: {count:,} 条记录")
        return True
    return False

def update_sales_forecast():
    """更新销售预测数据"""
    logger.info("🔄 开始更新销售预测数据...")
    
    # 获取历史销售数据
    sql = """
    SELECT 
        CONVERT(int, FORMAT(o.created_at, 'yyyyMMdd')) AS date_key,
        o.store_id,
        SUM(o.total_amount) AS revenue
    FROM dbo.orders o
    WHERE o.created_at IS NOT NULL
    GROUP BY CONVERT(int, FORMAT(o.created_at, 'yyyyMMdd')), o.store_id
    ORDER BY o.store_id, date_key
    """
    
    df = fetch_data(sql)
    if df.empty:
        logger.warning("⚠️ 没有历史销售数据用于预测")
        return False
    
    # 为每个门店生成未来7天的预测
    predictions = []
    for store_id in df['store_id'].unique():
        store_data = df[df['store_id'] == store_id].sort_values('date_key')
        if len(store_data) < 7:
            continue
            
        # 简单的移动平均预测
        recent_revenue = store_data['revenue'].tail(7).mean()
        
        # 生成未来7天的预测
        last_date = datetime.strptime(str(store_data['date_key'].iloc[-1]), '%Y%m%d')
        for i in range(1, 8):
            future_date = last_date + timedelta(days=i)
            future_date_key = int(future_date.strftime('%Y%m%d'))
            
            # 添加一些随机波动
            variation = np.random.normal(0, 0.1)
            predicted_revenue = recent_revenue * (1 + variation)
            
            predictions.append({
                'date_key': future_date_key,
                'store_id': store_id,
                'yhat': max(0, predicted_revenue),
                'model_name': 'simple_ma'
            })
    
    # 插入预测数据
    if predictions:
        insert_sql = """
        INSERT INTO dbo.fact_forecast_daily (date_key, store_id, yhat, model_name)
        VALUES (?, ?, ?, ?)
        """
        
        with get_conn() as conn:
            cursor = conn.cursor()
            for pred in predictions:
                cursor.execute(insert_sql, (
                    int(pred['date_key']),
                    int(pred['store_id']),
                    float(pred['yhat']),
                    str(pred['model_name'])
                ))
            conn.commit()
        
        logger.info(f"✅ 销售预测数据更新完成: {len(predictions):,} 条记录")
        return True
    return False

def update_site_selection():
    """更新选址评分数据"""
    logger.info("🔄 开始更新选址评分数据...")
    
    # 获取门店数据作为候选位置
    sql = """
    SELECT 
        s.id AS candidate_id,
        s.city,
        s.district AS biz_area,
        AVG(sd.revenue) AS avg_revenue,
        COUNT(DISTINCT s.id) AS store_count
    FROM dbo.stores s
    LEFT JOIN dbo.vw_sales_store_daily sd ON sd.store_id = s.id
    GROUP BY s.id, s.city, s.district
    """
    
    df = fetch_data(sql)
    if df.empty:
        logger.warning("⚠️ 没有门店数据用于选址分析")
        return False
    
    # 计算评分
    df['match_score'] = (df['avg_revenue'] / df['avg_revenue'].max()).fillna(0)
    df['cannibal_score'] = (df['store_count'] / df['store_count'].max()).fillna(0)
    df['total_score'] = 0.6 * df['match_score'] + 0.4 * (1 - df['cannibal_score'])
    df['rationale'] = "基于历史营收和门店密度的综合评分"
    
    # 插入数据
    insert_sql = """
    INSERT INTO dbo.fact_site_score (candidate_id, city, biz_area, match_score, cannibal_score, total_score, rationale)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """
    
    with get_conn() as conn:
        cursor = conn.cursor()
        for _, row in df.iterrows():
            cursor.execute(insert_sql, (
                int(row['candidate_id']),
                str(row['city']),
                str(row['biz_area']),
                float(row['match_score']),
                float(row['cannibal_score']),
                float(row['total_score']),
                str(row['rationale'])
            ))
        conn.commit()
    
    logger.info(f"✅ 选址评分数据更新完成: {len(df):,} 条记录")
    return True

def main():
    """主函数"""
    logger.info("🚀 开始更新分析层数据...")
    
    # 设置环境变量 - 使用RDS
    os.environ['MSSQL_HOST'] = 'rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com'
    os.environ['MSSQL_PORT'] = '1433'
    os.environ['MSSQL_USER'] = 'hotdog'
    os.environ['MSSQL_PASS'] = 'Zhkj@62102218'
    
    # 测试数据库连接
    try:
        with get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            logger.info("✅ 数据库连接成功")
    except Exception as e:
        logger.error(f"❌ 数据库连接失败: {e}")
        return
    
    # 执行各个更新步骤
    steps = [
        ("利润分析", update_profit_analysis),
        ("客户分群", update_customer_segmentation),
        ("销售预测", update_sales_forecast),
        ("选址评分", update_site_selection),
    ]
    
    success_count = 0
    for step_name, step_func in steps:
        logger.info(f"📋 执行步骤: {step_name}")
        if step_func():
            success_count += 1
        else:
            logger.warning(f"⚠️ 步骤失败: {step_name}")
    
    # 最终统计
    logger.info("🎉 数据更新完成!")
    logger.info(f"📊 成功步骤: {success_count}/{len(steps)}")
    
    # 显示最终数据统计
    logger.info("\n=== 最终数据统计 ===")
    analysis_tables = ['fact_profit_daily', 'dim_customer_segment', 'fact_forecast_daily', 'fact_site_score']
    for table in analysis_tables:
        try:
            with get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute(f"SELECT COUNT(*) FROM dbo.{table}")
                count = cursor.fetchone()[0]
                logger.info(f"{table}: {count:,} 条记录")
        except Exception as e:
            logger.error(f"{table}: 查询失败 - {e}")

if __name__ == "__main__":
    main()