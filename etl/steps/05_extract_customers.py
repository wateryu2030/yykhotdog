"""
ETL步骤05: 提取客户信息
从 cyrg2025.CardVip 和 cyrgweixin.XcxUser 提取客户数据，合并到 hotdog2030.customers
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

def extract_customers_from_cyrg2025():
    """从cyrg2025提取VIP客户数据"""
    logger.info("📊 开始从cyrg2025提取VIP客户数据...")
    
    sql = """
    SELECT 
        id,
        vipTel AS phone,
        vipName AS customer_name,
        vipSex AS gender,
        vipBirthday AS birthday,
        vipAddress AS address,
        vipScore AS score,
        vipMoney AS balance,
        recordTime AS created_at,
        'cyrg2025_vip' AS source_system
    FROM CardVip 
    WHERE delflag = 0
    AND vipTel IS NOT NULL
    AND vipTel != ''
    """
    
    df = fetch_df(sql, "cyrg2025")
    logger.info(f"✅ cyrg2025 VIP客户数据提取完成: {len(df)} 条记录")
    return df

def extract_customers_from_cyrgweixin():
    """从cyrgweixin提取微信用户数据"""
    logger.info("📊 开始从cyrgweixin提取微信用户数据...")
    
    sql = """
    SELECT 
        Id AS id,
        Tel AS phone,
        NickName AS customer_name,
        Sex AS gender,
        Birthday AS birthday,
        Address AS address,
        OpenId AS openid,
        WechatId AS wechat_id,
        AlipayId AS alipay_id,
        recordTime AS created_at,
        'cyrgweixin_wx' AS source_system
    FROM XcxUser 
    WHERE Delflag = 0
    AND Tel IS NOT NULL
    AND Tel != ''
    """
    
    df = fetch_df(sql, "cyrgweixin")
    logger.info(f"✅ cyrgweixin微信用户数据提取完成: {len(df)} 条记录")
    return df

def clean_and_merge_customers(df1, df2):
    """清洗和合并客户数据"""
    logger.info("🔄 开始清洗和合并客户数据...")
    
    # 合并数据
    df = pd.concat([df1, df2], ignore_index=True)
    logger.info(f"📊 合并后总记录数: {len(df)}")
    
    # 数据类型转换
    df['score'] = pd.to_numeric(df['score'], errors='coerce')
    df['balance'] = pd.to_numeric(df['balance'], errors='coerce')
    df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
    df['birthday'] = pd.to_datetime(df['birthday'], errors='coerce')
    
    # 填充缺失值
    df['score'] = df['score'].fillna(0)
    df['balance'] = df['balance'].fillna(0)
    df['gender'] = df['gender'].fillna('未知')
    df['address'] = df['address'].fillna('地址未填写')
    
    # 生成客户ID（基于手机号）
    df['customer_id'] = df['phone']
    
    # 去重（基于手机号）
    df = df.drop_duplicates(subset=['phone'], keep='first')
    
    # 计算客户年龄（如果有生日）
    current_year = dt.datetime.now().year
    df['age'] = None
    mask = df['birthday'].notna()
    df.loc[mask, 'age'] = current_year - df.loc[mask, 'birthday'].dt.year
    
    # 客户分类
    df['customer_type'] = '普通客户'
    df.loc[df['score'] > 1000, 'customer_type'] = 'VIP客户'
    df.loc[df['balance'] > 100, 'customer_type'] = '高价值客户'
    
    # 添加处理时间戳
    df['processed_at'] = dt.datetime.now()
    
    logger.info(f"✅ 客户数据清洗完成: {len(df)} 条有效记录")
    return df

def main():
    """主函数"""
    logger.info("🚀 开始ETL步骤05: 客户信息提取")
    
    try:
        # 提取数据
        df_cyrg2025 = extract_customers_from_cyrg2025()
        df_cyrgweixin = extract_customers_from_cyrgweixin()
        
        # 清洗合并
        df_merged = clean_and_merge_customers(df_cyrg2025, df_cyrgweixin)
        
        if df_merged.empty:
            logger.warning("⚠️ 没有有效数据可写入")
            return
        
        # 写入目标数据库
        logger.info("💾 开始写入hotdog2030.customers...")
        success = to_sql(df_merged, "dbo.customers", "hotdog2030", if_exists='replace')
        
        if success:
            # 验证结果
            count = get_table_count("hotdog2030", "customers")
            logger.info(f"🎉 ETL步骤05完成! hotdog2030.customers 现在有 {count} 条记录")
            
            # 输出统计信息
            logger.info(f"📊 客户统计:")
            logger.info(f"   - 总客户数: {count}")
            logger.info(f"   - VIP客户: {len(df_merged[df_merged['customer_type'] == 'VIP客户'])}")
            logger.info(f"   - 高价值客户: {len(df_merged[df_merged['customer_type'] == '高价值客户'])}")
            logger.info(f"   - 有微信ID的客户: {len(df_merged[df_merged['openid'].notna()])}")
        else:
            logger.error("❌ 数据写入失败")
            
    except Exception as e:
        logger.error(f"❌ ETL步骤05执行失败: {str(e)}")
        raise

if __name__ == "__main__":
    main()
