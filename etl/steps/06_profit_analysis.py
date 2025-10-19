"""
ETL步骤06: 利润分析模块
计算门店毛利、净利，生成利润分析报表
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

def calculate_store_profits():
    """计算门店利润分析"""
    logger.info("📊 开始计算门店利润分析...")
    
    # 获取订单和门店数据
    sql_orders = """
    SELECT 
        o.store_id,
        s.store_name,
        s.city,
        s.province,
        s.rent_amount,
        o.total_amount,
        o.created_at
    FROM orders o
    JOIN stores s ON o.store_id = s.id
    WHERE o.total_amount > 0
    AND o.created_at >= DATEADD(month, -12, GETDATE())
    """
    
    df_orders = fetch_df(sql_orders, "hotdog2030")
    
    # 获取商品成本数据
    sql_products = """
    SELECT 
        oi.product_id,
        p.cost_price,
        p.sale_price,
        oi.quantity,
        oi.total_price,
        o.store_id,
        o.created_at
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.created_at >= DATEADD(month, -12, GETDATE())
    """
    
    df_products = fetch_df(sql_products, "hotdog2030")
    
    if df_orders.empty or df_products.empty:
        logger.warning("⚠️ 没有足够的数据进行利润分析")
        return pd.DataFrame()
    
    # 计算商品成本
    df_products['cost_amount'] = df_products['quantity'] * df_products['cost_price']
    df_products['profit_amount'] = df_products['total_price'] - df_products['cost_amount']
    df_products['profit_margin'] = (df_products['profit_amount'] / df_products['total_price'] * 100).round(2)
    
    # 按门店聚合
    store_profits = df_products.groupby('store_id').agg({
        'total_price': 'sum',
        'cost_amount': 'sum',
        'profit_amount': 'sum',
        'quantity': 'sum'
    }).reset_index()
    
    # 计算门店收入
    store_revenue = df_orders.groupby('store_id').agg({
        'total_amount': 'sum',
        'created_at': 'count'
    }).reset_index()
    store_revenue.columns = ['store_id', 'total_revenue', 'order_count']
    
    # 合并数据
    df_profits = pd.merge(store_profits, store_revenue, on='store_id', how='left')
    df_profits = pd.merge(df_profits, df_orders[['store_id', 'store_name', 'city', 'province', 'rent_amount']].drop_duplicates(), on='store_id', how='left')
    
    # 计算利润率
    df_profits['gross_profit_margin'] = (df_profits['profit_amount'] / df_profits['total_revenue'] * 100).round(2)
    
    # 估算运营成本（租金 + 人工 + 水电等）
    df_profits['estimated_operating_cost'] = df_profits['rent_amount'] * 12 + df_profits['total_revenue'] * 0.15  # 15%运营成本
    df_profits['net_profit'] = df_profits['profit_amount'] - df_profits['estimated_operating_cost']
    df_profits['net_profit_margin'] = (df_profits['net_profit'] / df_profits['total_revenue'] * 100).round(2)
    
    # 添加分析时间戳
    df_profits['analysis_date'] = dt.datetime.now()
    
    logger.info(f"✅ 门店利润分析完成: {len(df_profits)} 个门店")
    return df_profits

def create_profit_analysis_table():
    """创建利润分析表"""
    logger.info("📋 创建利润分析表...")
    
    create_table_sql = """
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='store_profit_analysis' AND xtype='U')
    CREATE TABLE store_profit_analysis (
        id int IDENTITY(1,1) PRIMARY KEY,
        store_id int,
        store_name nvarchar(100),
        city nvarchar(50),
        province nvarchar(50),
        total_revenue decimal(18,2),
        total_cost decimal(18,2),
        gross_profit decimal(18,2),
        gross_profit_margin decimal(5,2),
        rent_amount decimal(18,2),
        estimated_operating_cost decimal(18,2),
        net_profit decimal(18,2),
        net_profit_margin decimal(5,2),
        order_count int,
        analysis_date datetime2,
        created_at datetime2 DEFAULT GETDATE()
    )
    """
    
    execute_sql(create_table_sql, "hotdog2030")
    logger.info("✅ 利润分析表创建完成")

def main():
    """主函数"""
    logger.info("🚀 开始ETL步骤06: 利润分析")
    
    try:
        # 创建分析表
        create_profit_analysis_table()
        
        # 计算利润分析
        df_profits = calculate_store_profits()
        
        if df_profits.empty:
            logger.warning("⚠️ 没有数据可分析")
            return
        
        # 写入分析结果
        logger.info("💾 开始写入利润分析结果...")
        success = to_sql(df_profits, "dbo.store_profit_analysis", "hotdog2030", if_exists='append')
        
        if success:
            # 验证结果
            count = get_table_count("hotdog2030", "store_profit_analysis")
            logger.info(f"🎉 ETL步骤06完成! 利润分析表现在有 {count} 条记录")
            
            # 输出统计信息
            logger.info(f"📊 利润分析统计:")
            logger.info(f"   - 分析门店数: {len(df_profits)}")
            logger.info(f"   - 平均毛利率: {df_profits['gross_profit_margin'].mean():.2f}%")
            logger.info(f"   - 平均净利率: {df_profits['net_profit_margin'].mean():.2f}%")
            logger.info(f"   - 最高净利率门店: {df_profits.loc[df_profits['net_profit_margin'].idxmax(), 'store_name']}")
        else:
            logger.error("❌ 数据写入失败")
            
    except Exception as e:
        logger.error(f"❌ ETL步骤06执行失败: {str(e)}")
        raise

if __name__ == "__main__":
    main()
