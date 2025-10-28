"""
ETL步骤10: 仪表板指标聚合
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

def main():
    """主函数"""
    logger.info("🚀 开始ETL步骤10: 仪表板指标聚合")
    
    try:
        # 从 hotdog2030.orders, hotdog2030.stores, hotdog2030.customers 获取数据
        orders_df = fetch_df("SELECT id, store_id, customer_id, total_amount, created_at FROM orders", DW)
        stores_df = fetch_df("SELECT id, store_name, city, province, district FROM stores", DW)
        customers_df = fetch_df("SELECT id, customer_id FROM customers", DW)
        
        if orders_df.empty or stores_df.empty:
            logger.warning("⚠️ 没有足够数据生成仪表板指标")
            return
        
        orders_df['created_at'] = pd.to_datetime(orders_df['created_at'])
        orders_df['order_date'] = orders_df['created_at'].dt.date
        
        # 合并订单和门店信息
        df = pd.merge(orders_df, stores_df, left_on='store_id', right_on='id', suffixes=('_order', '_store'))
        
        # 计算每日/每月/每店/每城KPI
        # 示例：每日总销售额、订单数、平均客单价
        daily_metrics = df.groupby('order_date').agg(
            total_revenue=('total_amount', 'sum'),
            total_orders=('id_order', 'count'),
            avg_order_value=('total_amount', 'mean')
        ).reset_index()
        
        # 示例：每店总销售额、订单数、客户数
        store_metrics = df.groupby(['store_id', 'store_name', 'city', 'district']).agg(
            total_revenue=('total_amount', 'sum'),
            total_orders=('id_order', 'count'),
            unique_customers=('customer_id', lambda x: x.nunique() if x.name == 'customer_id' else pd.NA)
        ).reset_index()
        # 确保 unique_customers 列是数值类型
        store_metrics['unique_customers'] = pd.to_numeric(store_metrics['unique_customers'], errors='coerce').fillna(0).astype(int)
        
        # 示例：每城总销售额、订单数、客户数
        city_metrics = df.groupby(['city', 'province']).agg(
            total_revenue=('total_amount', 'sum'),
            total_orders=('id_order', 'count'),
            unique_customers=('customer_id', lambda x: x.nunique() if x.name == 'customer_id' else pd.NA)
        ).reset_index()
        city_metrics['unique_customers'] = pd.to_numeric(city_metrics['unique_customers'], errors='coerce').fillna(0).astype(int)
        
        # 写入数据库
        logger.info("💾 开始写入仪表板指标...")
        
        # 写入每日指标
        if not daily_metrics.empty:
            success = to_sql(daily_metrics, "ddashboard_daily_metrics", DW, if_exists='append')
            if success:
                count = get_table_count(DW, "dashboard_daily_metrics")
                logger.info(f"✅ 每日指标写入完成: {count} 条记录")
        
        # 写入门店指标
        if not store_metrics.empty:
            success = to_sql(store_metrics, "ddashboard_store_metrics", DW, if_exists='append')
            if success:
                count = get_table_count(DW, "dashboard_store_metrics")
                logger.info(f"✅ 门店指标写入完成: {count} 条记录")
        
        # 写入城市指标
        if not city_metrics.empty:
            success = to_sql(city_metrics, "ddashboard_city_metrics", DW, if_exists='append')
            if success:
                count = get_table_count(DW, "dashboard_city_metrics")
                logger.info(f"✅ 城市指标写入完成: {count} 条记录")
        
        logger.info("🎉 ETL步骤10完成! 仪表板指标聚合完成")
        
        # 输出统计信息
        logger.info(f"📊 仪表板指标统计:")
        logger.info(f"   - 每日指标: {len(daily_metrics)} 条")
        logger.info(f"   - 门店指标: {len(store_metrics)} 条")
        logger.info(f"   - 城市指标: {len(city_metrics)} 条")
        
        if not city_metrics.empty:
            top_city = city_metrics.iloc[0]
            logger.info(f"   - 最佳城市: {top_city['city']} (收入: {top_city['total_revenue']:.2f})")
        
        if not store_metrics.empty:
            top_store = store_metrics.iloc[0]
            logger.info(f"   - 最佳门店: {top_store['store_name']} (收入: {top_store['total_revenue']:.2f})")
            
    except Exception as e:
        logger.error(f"❌ ETL步骤10执行失败: {str(e)}")
        raise

if __name__ == "__main__":
    main()