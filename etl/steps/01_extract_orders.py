"""
ETL步骤01: 合并订单数据
从 cyrg2025 和 cyrgweixin 提取订单数据，合并到 hotdog2030.orders
"""
import sys
import os
import pandas as pd
import datetime as dt
from pathlib import Path

# 添加lib路径
sys.path.append(str(Path(__file__).parent.parent))
from lib.mssql import fetch_df, to_sql, get_table_count
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def extract_orders_from_cyrg2025():
    """从cyrg2025提取订单数据"""
    logger.info("📊 开始从cyrg2025提取订单数据...")
    
    sql = """
    SELECT 
        orderNo AS order_no,
        shopId AS store_id,
        openId AS customer_id,
        total AS total_amount,
        payState AS pay_state,
        payMode AS pay_mode,
        success_time AS created_at,
        recordTime AS updated_at,
        'cyrg2025' AS source_system
    FROM Orders 
    WHERE delflag = 0 
    AND total > 0 
    AND total < 10000
    AND success_time IS NOT NULL
    """
    
    df = fetch_df(sql, "cyrg2025")
    logger.info(f"✅ cyrg2025订单数据提取完成: {len(df)} 条记录")
    return df

def extract_orders_from_cyrgweixin():
    """从cyrgweixin提取订单数据"""
    logger.info("📊 开始从cyrgweixin提取订单数据...")
    
    sql = """
    SELECT 
        orderNo AS order_no,
        shopId AS store_id,
        openId AS customer_id,
        total AS total_amount,
        payState AS pay_state,
        payMode AS pay_mode,
        success_time AS created_at,
        recordTime AS updated_at,
        'cyrgweixin' AS source_system
    FROM Orders 
    WHERE delflag = 0 
    AND total > 0 
    AND total < 10000
    AND success_time IS NOT NULL
    """
    
    df = fetch_df(sql, "cyrgweixin")
    logger.info(f"✅ cyrgweixin订单数据提取完成: {len(df)} 条记录")
    return df

def clean_and_merge_orders(df1, df2):
    """清洗和合并订单数据"""
    logger.info("🔄 开始清洗和合并订单数据...")
    
    # 合并数据
    df = pd.concat([df1, df2], ignore_index=True)
    logger.info(f"📊 合并后总记录数: {len(df)}")
    
    # 数据类型转换
    df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
    df['updated_at'] = pd.to_datetime(df['updated_at'], errors='coerce')
    df['total_amount'] = pd.to_numeric(df['total_amount'], errors='coerce')
    df['store_id'] = pd.to_numeric(df['store_id'], errors='coerce')
    
    # 过滤无效数据
    df = df.dropna(subset=['order_no', 'created_at', 'total_amount'])
    df = df[df['total_amount'] > 0]
    df = df[df['total_amount'] < 10000]  # 过滤异常大额订单
    
    # 去重
    df = df.drop_duplicates(subset=['order_no'], keep='first')
    
    # 添加处理时间戳
    df['processed_at'] = dt.datetime.now()
    
    logger.info(f"✅ 数据清洗完成: {len(df)} 条有效记录")
    return df

def main():
    """主函数"""
    logger.info("🚀 开始ETL步骤01: 订单数据提取")
    
    try:
        # 提取数据
        df_cyrg2025 = extract_orders_from_cyrg2025()
        df_cyrgweixin = extract_orders_from_cyrgweixin()
        
        # 清洗合并
        df_merged = clean_and_merge_orders(df_cyrg2025, df_cyrgweixin)
        
        if df_merged.empty:
            logger.warning("⚠️ 没有有效数据可写入")
            return
        
        # 写入目标数据库
        logger.info("💾 开始写入hotdog2030.orders...")
        success = to_sql(df_merged, "orders", "hotdog2030", if_exists='replace')
        
        if success:
            # 验证结果
            count = get_table_count("hotdog2030", "orders")
            logger.info(f"🎉 ETL步骤01完成! hotdog2030.orders 现在有 {count} 条记录")
        else:
            logger.error("❌ 数据写入失败")
            
    except Exception as e:
        logger.error(f"❌ ETL步骤01执行失败: {str(e)}")
        raise

if __name__ == "__main__":
    main()
