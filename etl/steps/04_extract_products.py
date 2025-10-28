"""
ETL步骤04: 提取商品信息
从 cyrg2025.Goods 提取商品数据，写入到 hotdog2030.products
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

def extract_products_from_cyrg2025():
    """从cyrg2025提取商品数据"""
    logger.info("📊 开始从cyrg2025提取商品数据...")
    
    sql = """
    SELECT 
        id,
        goodsName AS product_name,
        categoryId AS category_id,
        salePrice AS sale_price,
        marktPrice AS market_price,
        costPrice AS cost_price,
        goodsStock AS goods_stock,
        isSale AS is_sale,
        isHot AS is_hot,
        isRecom AS is_recommended,
        shopId AS shop_id,
        goodsUnit AS unit,
        goodsDesc AS description,
        goodsImage AS image_url,
        recordTime AS created_at,
        'cyrg2025' AS source_system
    FROM Goods 
    WHERE delflag = 0
    """
    
    df = fetch_df(sql, "cyrg2025")
    logger.info(f"✅ cyrg2025商品数据提取完成: {len(df)} 条记录")
    return df

def clean_products_data(df):
    """清洗商品数据"""
    logger.info("🔄 开始清洗商品数据...")
    
    # 数据类型转换
    df['sale_price'] = pd.to_numeric(df['sale_price'], errors='coerce')
    df['market_price'] = pd.to_numeric(df['market_price'], errors='coerce')
    df['cost_price'] = pd.to_numeric(df['cost_price'], errors='coerce')
    df['goods_stock'] = pd.to_numeric(df['goods_stock'], errors='coerce')
    df['is_sale'] = df['is_sale'].astype(int)
    df['is_hot'] = df['is_hot'].astype(int)
    df['is_recommended'] = df['is_recommended'].astype(int)
    df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
    
    # 填充缺失值
    df['sale_price'] = df['sale_price'].fillna(0)
    df['market_price'] = df['market_price'].fillna(df['sale_price'])
    df['cost_price'] = df['cost_price'].fillna(0)
    df['goods_stock'] = df['goods_stock'].fillna(0)
    df['unit'] = df['unit'].fillna('个')
    df['description'] = df['description'].fillna('')
    
    # 过滤无效数据
    df = df[df['product_name'].notna()]
    df = df[df['product_name'] != '']
    
    # 计算毛利率
    df['profit_margin'] = 0
    mask = (df['sale_price'] > 0) & (df['cost_price'] > 0)
    df.loc[mask, 'profit_margin'] = ((df.loc[mask, 'sale_price'] - df.loc[mask, 'cost_price']) / df.loc[mask, 'sale_price'] * 100).round(2)
    
    # 添加处理时间戳
    df['processed_at'] = dt.datetime.now()
    
    logger.info(f"✅ 商品数据清洗完成: {len(df)} 条有效记录")
    return df

def main():
    """主函数"""
    logger.info("🚀 开始ETL步骤04: 商品信息提取")
    
    try:
        # 提取数据
        df_products = extract_products_from_cyrg2025()
        
        if df_products.empty:
            logger.warning("⚠️ 没有商品数据可处理")
            return
        
        # 清洗数据
        df_cleaned = clean_products_data(df_products)
        
        # 写入目标数据库
        logger.info("💾 开始写入hotdog2030.products...")
        success = to_sql(df_cleaned, "dproducts", "hotdog2030", if_exists='replace')
        
        if success:
            # 验证结果
            count = get_table_count("hotdog2030", "products")
            logger.info(f"🎉 ETL步骤04完成! hotdog2030.products 现在有 {count} 条记录")
            
            # 输出统计信息
            logger.info(f"📊 商品统计:")
            logger.info(f"   - 总商品数: {count}")
            logger.info(f"   - 在售商品: {df_cleaned['is_sale'].sum()}")
            logger.info(f"   - 热销商品: {df_cleaned['is_hot'].sum()}")
            logger.info(f"   - 推荐商品: {df_cleaned['is_recommended'].sum()}")
        else:
            logger.error("❌ 数据写入失败")
            
    except Exception as e:
        logger.error(f"❌ ETL步骤04执行失败: {str(e)}")
        raise

if __name__ == "__main__":
    main()
