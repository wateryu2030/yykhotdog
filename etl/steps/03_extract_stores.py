"""
ETL步骤03: 提取门店信息
从 cyrg2025.Shop 和 cyrgweixin.Rg_Shop 提取门店数据，合并到 hotdog2030.stores
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

def extract_stores_from_cyrg2025():
    """从cyrg2025提取门店数据"""
    logger.info("📊 开始从cyrg2025提取门店数据...")
    
    sql = """
    SELECT 
        Id AS id,
        ShopName AS store_name,
        city AS city,
        province AS province,
        district AS district,
        ShopAddress AS address,
        rent AS rent_amount,
        isClose AS is_close,
        isUse AS is_self,
        ShopArea AS area,
        ShopPhone AS phone,
        ShopManager AS manager,
        recordTime AS created_at,
        'cyrg2025' AS source_system
    FROM Shop 
    WHERE delflag = 0
    """
    
    df = fetch_df(sql, "cyrg2025")
    logger.info(f"✅ cyrg2025门店数据提取完成: {len(df)} 条记录")
    return df

def extract_stores_from_cyrgweixin():
    """从cyrgweixin提取门店数据"""
    logger.info("📊 开始从cyrgweixin提取门店数据...")
    
    sql = """
    SELECT 
        Id AS id,
        ShopName AS store_name,
        city AS city,
        province AS province,
        district AS district,
        ShopAddress AS address,
        rent AS rent_amount,
        isClose AS is_close,
        isUse AS is_self,
        ShopArea AS area,
        ShopPhone AS phone,
        ShopManager AS manager,
        recordTime AS created_at,
        'cyrgweixin' AS source_system
    FROM Rg_Shop 
    WHERE delflag = 0
    """
    
    df = fetch_df(sql, "cyrgweixin")
    logger.info(f"✅ cyrgweixin门店数据提取完成: {len(df)} 条记录")
    return df

def clean_and_merge_stores(df1, df2):
    """清洗和合并门店数据"""
    logger.info("🔄 开始清洗和合并门店数据...")
    
    # 合并数据
    df = pd.concat([df1, df2], ignore_index=True)
    logger.info(f"📊 合并后总记录数: {len(df)}")
    
    # 数据类型转换
    df['rent_amount'] = pd.to_numeric(df['rent_amount'], errors='coerce')
    df['area'] = pd.to_numeric(df['area'], errors='coerce')
    df['is_close'] = df['is_close'].astype(int)
    df['is_self'] = df['is_self'].astype(int)
    df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
    
    # 填充缺失值
    df['city'] = df['city'].fillna('未知城市')
    df['province'] = df['province'].fillna('未知省份')
    df['district'] = df['district'].fillna('未知区域')
    df['address'] = df['address'].fillna('地址未填写')
    df['rent_amount'] = df['rent_amount'].fillna(0)
    df['area'] = df['area'].fillna(0)
    
    # 生成门店编码
    df['store_code'] = "S" + df['id'].astype(str)
    
    # 去重（基于门店名称和地址）
    df = df.drop_duplicates(subset=['store_name', 'address'], keep='first')
    
    # 添加处理时间戳
    df['processed_at'] = dt.datetime.now()
    
    logger.info(f"✅ 门店数据清洗完成: {len(df)} 条有效记录")
    return df

def main():
    """主函数"""
    logger.info("🚀 开始ETL步骤03: 门店信息提取")
    
    try:
        # 提取数据
        df_cyrg2025 = extract_stores_from_cyrg2025()
        df_cyrgweixin = extract_stores_from_cyrgweixin()
        
        # 清洗合并
        df_merged = clean_and_merge_stores(df_cyrg2025, df_cyrgweixin)
        
        if df_merged.empty:
            logger.warning("⚠️ 没有有效数据可写入")
            return
        
        # 写入目标数据库
        logger.info("💾 开始写入hotdog2030.stores...")
        success = to_sql(df_merged, "dbo.stores", "hotdog2030", if_exists='replace')
        
        if success:
            # 验证结果
            count = get_table_count("hotdog2030", "stores")
            logger.info(f"🎉 ETL步骤03完成! hotdog2030.stores 现在有 {count} 条记录")
        else:
            logger.error("❌ 数据写入失败")
            
    except Exception as e:
        logger.error(f"❌ ETL步骤03执行失败: {str(e)}")
        raise

if __name__ == "__main__":
    main()
