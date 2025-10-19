"""
ETL步骤06: 利润分析模块
计算门店毛利、净利，生成利润分析报表
基于OpenAI建议的优化版本
"""
import sys
import os
import pandas as pd
import numpy as np
import datetime as dt
from pathlib import Path

# 添加lib路径
sys.path.append(str(Path(__file__).parent.parent))
from lib.mssql import fetch_df, to_sql, get_conn, get_table_count, execute_sql
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DW = "hotdog2030"

def calc_profit_daily():
    """计算每日利润数据"""
    logger.info("📊 开始计算每日利润数据...")
    
    sql = """
    SELECT
      CONVERT(int, FORMAT(o.created_at, 'yyyyMMdd')) AS date_key,
      o.store_id,
      SUM(o.total_amount) AS revenue,
      SUM(oi.quantity * ISNULL(p.cost_price,0)) AS cogs
    FROM dbo.orders o
    JOIN dbo.order_items oi ON oi.order_id = o.id
    LEFT JOIN dbo.products p ON p.id = oi.product_id
    GROUP BY CONVERT(int, FORMAT(o.created_at, 'yyyyMMdd')), o.store_id
    """
    
    df = fetch_df(sql, DW)
    logger.info(f"✅ 每日利润数据计算完成: {len(df)} 条记录")
    return df

def upsert_profit(df):
    """更新或插入利润数据"""
    if df.empty: 
        logger.warning("⚠️ 没有利润数据可处理")
        return
    
    logger.info("💾 开始更新利润数据...")
    
    # operating_exp 初期置 0；后续可外部表导入再合并
    df['operating_exp'] = 0
    
    with get_conn(DW) as conn:
        cur = conn.cursor()
        success_count = 0
        
        for _, r in df.iterrows():
            try:
                cur.execute("""
MERGE dbo.fact_profit_daily AS T
USING (SELECT ? AS date_key, ? AS store_id) AS S
ON (T.date_key=S.date_key AND T.store_id=S.store_id)
WHEN MATCHED THEN UPDATE SET revenue=?, cogs=?, operating_exp=ISNULL(T.operating_exp,0)
WHEN NOT MATCHED THEN INSERT (date_key, store_id, revenue, cogs, operating_exp)
VALUES (S.date_key, S.store_id, ?, ?, 0);
""", 
                    int(r['date_key']), 
                    int(r['store_id']),
                    float(r['revenue'] or 0), 
                    float(r['cogs'] or 0),
                    float(r['revenue'] or 0), 
                    float(r['cogs'] or 0)
                )
                success_count += 1
            except Exception as e:
                logger.warning(f"⚠️ 跳过行插入: {str(e)}")
                continue
        
        conn.commit()
        logger.info(f"✅ 利润数据更新完成: {success_count} 条记录")

def main():
    """主函数"""
    logger.info("🚀 开始ETL步骤06: 利润分析")
    
    try:
        # 计算每日利润数据
        df_profits = calc_profit_daily()
        
        if df_profits.empty:
            logger.warning("⚠️ 没有数据可分析")
            return
        
        # 更新利润数据
        upsert_profit(df_profits)
        
        # 验证结果
        count = get_table_count(DW, "fact_profit_daily")
        logger.info(f"🎉 ETL步骤06完成! fact_profit_daily表现在有 {count} 条记录")
        
        # 输出统计信息
        logger.info(f"📊 利润分析统计:")
        logger.info(f"   - 处理记录数: {len(df_profits)}")
        logger.info(f"   - 平均收入: {df_profits['revenue'].mean():.2f}")
        logger.info(f"   - 平均成本: {df_profits['cogs'].mean():.2f}")
        logger.info(f"   - 平均毛利率: {((df_profits['revenue'] - df_profits['cogs']) / df_profits['revenue'] * 100).mean():.2f}%")
            
    except Exception as e:
        logger.error(f"❌ ETL步骤06执行失败: {str(e)}")
        raise

if __name__ == "__main__":
    main()
