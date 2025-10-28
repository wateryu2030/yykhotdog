"""
ETL步骤02: 提取订单明细数据
从 cyrg2025 和 cyrgweixin 提取订单明细，合并到 hotdog2030.order_items
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

def extract_order_items_from_cyrg2025():
    """从cyrg2025提取订单明细数据"""
    logger.info("📊 开始从cyrg2025提取订单明细数据...")
    
    sql = """
    SELECT 
        orderId AS order_id,
        goodsId AS product_id,
        goodsName AS product_name,
        goodsNumber AS quantity,
        goodsPrice AS price,
        goodsTotal AS total_price,
        recordTime AS created_at,
        'cyrg2025' AS source_system
    FROM OrderGoods 
    WHERE delflag = 0 
    AND goodsNumber > 0 
    AND goodsPrice > 0
    """
    
    df = fetch_df(sql, "cyrg2025")
    logger.info(f"✅ cyrg2025订单明细数据提取完成: {len(df)} 条记录")
    return df

def extract_order_items_from_cyrgweixin():
    """从cyrgweixin提取订单明细数据"""
    logger.info("📊 开始从cyrgweixin提取订单明细数据...")
    
    sql = """
    SELECT 
        orderId AS order_id,
        goodsId AS product_id,
        goodsName AS product_name,
        goodsNumber AS quantity,
        goodsPrice AS price,
        goodsTotal AS total_price,
        recordTime AS created_at,
        'cyrgweixin' AS source_system
    FROM OrderGoods 
    WHERE delflag = 0 
    AND goodsNumber > 0 
    AND goodsPrice > 0
    """
    
    df = fetch_df(sql, "cyrgweixin")
    logger.info(f"✅ cyrgweixin订单明细数据提取完成: {len(df)} 条记录")
    return df

def clean_and_merge_order_items(df1, df2):
    """清洗和合并订单明细数据"""
    logger.info("🔄 开始清洗和合并订单明细数据...")
    
    # 合并数据
    df = pd.concat([df1, df2], ignore_index=True)
    logger.info(f"📊 合并后总记录数: {len(df)}")
    
    # 数据类型转换
    df['quantity'] = pd.to_numeric(df['quantity'], errors='coerce')
    df['price'] = pd.to_numeric(df['price'], errors='coerce')
    df['total_price'] = pd.to_numeric(df['total_price'], errors='coerce')
    df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
    
    # 过滤无效数据
    df = df.dropna(subset=['order_id', 'product_id', 'quantity', 'price'])
    df = df[df['quantity'] > 0]
    df = df[df['price'] > 0]
    
    # 计算总价（如果为空）
    df['total_price'] = df['total_price'].fillna(df['quantity'] * df['price'])
    
    # 去重
    df = df.drop_duplicates(subset=['order_id', 'product_id', 'created_at'], keep='first')
    
    # 添加处理时间戳
    df['processed_at'] = dt.datetime.now()
    
    logger.info(f"✅ 订单明细数据清洗完成: {len(df)} 条有效记录")
    return df

def main():
    """主函数"""
    logger.info("🚀 开始ETL步骤02: 订单明细数据提取")
    
    try:
        # 提取数据
        df_cyrg2025 = extract_order_items_from_cyrg2025()
        df_cyrgweixin = extract_order_items_from_cyrgweixin()
        
        # 清洗合并
        df_merged = clean_and_merge_order_items(df_cyrg2025, df_cyrgweixin)
        
        if df_merged.empty:
            logger.warning("⚠️ 没有有效数据可写入")
            return
        
        # 写入目标数据库
        logger.info("💾 开始写入hotdog2030.order_items...")
        success = to_sql(df_merged, "dorder_items", "hotdog2030", if_exists='replace')
        
        if success:
            # 验证结果
            count = get_table_count("hotdog2030", "order_items")
            logger.info(f"🎉 ETL步骤02完成! hotdog2030.order_items 现在有 {count} 条记录")
        else:
            logger.error("❌ 数据写入失败")
            
    except Exception as e:
        logger.error(f"❌ ETL步骤02执行失败: {str(e)}")
        raise

if __name__ == "__main__":
    main()
