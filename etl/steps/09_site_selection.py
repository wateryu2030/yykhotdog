"""
ETL步骤09: 智能选址分析
基于历史门店表现和选址数据，生成选址评分
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

def analyze_existing_stores():
    """分析现有门店表现"""
    logger.info("📊 开始分析现有门店表现...")
    
    # 获取门店表现数据
    sql = """
    SELECT 
        s.id as store_id,
        s.store_name,
        s.city,
        s.province,
        s.district,
        s.rent_amount,
        s.area,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(DISTINCT o.customer_id) as unique_customers
    FROM stores s
    LEFT JOIN orders o ON s.id = o.store_id
    WHERE o.created_at >= DATEADD(month, -12, GETDATE())
    GROUP BY s.id, s.store_name, s.city, s.province, s.district, s.rent_amount, s.area
    """
    
    df_stores = fetch_df(sql, "hotdog2030")
    
    if df_stores.empty:
        logger.warning("⚠️ 没有门店数据")
        return pd.DataFrame()
    
    # 计算门店评分指标
    df_stores['revenue_per_sqm'] = df_stores['total_revenue'] / df_stores['area'].replace(0, 1)
    df_stores['rent_ratio'] = df_stores['rent_amount'] / df_stores['total_revenue'].replace(0, 1)
    df_stores['customer_frequency'] = df_stores['order_count'] / df_stores['unique_customers'].replace(0, 1)
    
    # 标准化评分 (0-100分)
    for col in ['total_revenue', 'revenue_per_sqm', 'avg_order_value', 'unique_customers']:
        if df_stores[col].max() > df_stores[col].min():
            df_stores[f'{col}_score'] = ((df_stores[col] - df_stores[col].min()) / 
                                       (df_stores[col].max() - df_stores[col].min()) * 100).round(2)
        else:
            df_stores[f'{col}_score'] = 50
    
    # 综合评分
    df_stores['overall_score'] = (
        df_stores['total_revenue_score'] * 0.3 +
        df_stores['revenue_per_sqm_score'] * 0.25 +
        df_stores['avg_order_value_score'] * 0.2 +
        df_stores['unique_customers_score'] * 0.25
    ).round(2)
    
    logger.info(f"✅ 现有门店分析完成: {len(df_stores)} 个门店")
    return df_stores

def get_site_evaluation_data():
    """获取选址评估数据"""
    logger.info("📊 开始获取选址评估数据...")
    
    # 从cyrgweixin获取选址数据
    sql = """
    SELECT 
        Id as site_id,
        ShopName as site_name,
        city,
        province,
        district,
        ShopAddress as address,
        rent as rent_amount,
        ShopArea as area,
        ShopPhone as phone,
        recordTime as created_at
    FROM Rg_SeekShop 
    WHERE delflag = 0
    """
    
    df_sites = fetch_df(sql, "cyrgweixin")
    
    if df_sites.empty:
        logger.warning("⚠️ 没有选址数据")
        return pd.DataFrame()
    
    # 数据清洗
    df_sites['rent_amount'] = pd.to_numeric(df_sites['rent_amount'], errors='coerce')
    df_sites['area'] = pd.to_numeric(df_sites['area'], errors='coerce')
    df_sites['created_at'] = pd.to_datetime(df_sites['created_at'], errors='coerce')
    
    # 填充缺失值
    df_sites['rent_amount'] = df_sites['rent_amount'].fillna(0)
    df_sites['area'] = df_sites['area'].fillna(0)
    df_sites['city'] = df_sites['city'].fillna('未知城市')
    df_sites['province'] = df_sites['province'].fillna('未知省份')
    
    logger.info(f"✅ 选址数据获取完成: {len(df_sites)} 个候选地址")
    return df_sites

def calculate_site_scores(df_stores, df_sites):
    """计算选址评分"""
    logger.info("🔍 开始计算选址评分...")
    
    site_scores = []
    
    for _, site in df_sites.iterrows():
        # 基础评分
        base_score = 50
        
        # 租金评分 (租金越低评分越高)
        if site['rent_amount'] > 0:
            rent_score = max(0, 100 - (site['rent_amount'] / 1000) * 10)
        else:
            rent_score = 50
        
        # 面积评分
        if site['area'] > 0:
            area_score = min(100, site['area'] / 10)  # 面积越大评分越高
        else:
            area_score = 50
        
        # 同城门店表现评分
        same_city_stores = df_stores[df_stores['city'] == site['city']]
        if not same_city_stores.empty:
            city_avg_score = same_city_stores['overall_score'].mean()
            city_score = city_avg_score * 0.8  # 同城表现影响80%
        else:
            city_score = 50
        
        # 同区域门店表现评分
        same_district_stores = df_stores[
            (df_stores['city'] == site['city']) & 
            (df_stores['district'] == site['district'])
        ]
        if not same_district_stores.empty:
            district_avg_score = same_district_stores['overall_score'].mean()
            district_score = district_avg_score * 0.9  # 同区域表现影响90%
        else:
            district_score = city_score
        
        # 综合评分
        final_score = (
            base_score * 0.2 +
            rent_score * 0.25 +
            area_score * 0.15 +
            city_score * 0.2 +
            district_score * 0.2
        )
        
        # 选址建议
        if final_score >= 80:
            recommendation = '强烈推荐'
        elif final_score >= 70:
            recommendation = '推荐'
        elif final_score >= 60:
            recommendation = '可考虑'
        else:
            recommendation = '不推荐'
        
        site_scores.append({
            'site_id': site['site_id'],
            'site_name': site['site_name'],
            'city': site['city'],
            'province': site['province'],
            'district': site['district'],
            'address': site['address'],
            'rent_amount': site['rent_amount'],
            'area': site['area'],
            'base_score': base_score,
            'rent_score': rent_score,
            'area_score': area_score,
            'city_score': city_score,
            'district_score': district_score,
            'final_score': round(final_score, 2),
            'recommendation': recommendation,
            'analysis_date': dt.datetime.now()
        })
    
    df_scores = pd.DataFrame(site_scores)
    logger.info(f"✅ 选址评分计算完成: {len(df_scores)} 个候选地址")
    return df_scores

def create_site_evaluation_table():
    """创建选址评估表"""
    logger.info("📋 创建选址评估表...")
    
    create_table_sql = """
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='site_evaluation' AND xtype='U')
    CREATE TABLE site_evaluation (
        id int IDENTITY(1,1) PRIMARY KEY,
        site_id int,
        site_name nvarchar(100),
        city nvarchar(50),
        province nvarchar(50),
        district nvarchar(50),
        address nvarchar(200),
        rent_amount decimal(18,2),
        area decimal(18,2),
        base_score decimal(5,2),
        rent_score decimal(5,2),
        area_score decimal(5,2),
        city_score decimal(5,2),
        district_score decimal(5,2),
        final_score decimal(5,2),
        recommendation nvarchar(50),
        analysis_date datetime2,
        created_at datetime2 DEFAULT GETDATE()
    )
    """
    
    execute_sql(create_table_sql, "hotdog2030")
    logger.info("✅ 选址评估表创建完成")

def main():
    """主函数"""
    logger.info("🚀 开始ETL步骤09: 智能选址分析")
    
    try:
        # 创建评估表
        create_site_evaluation_table()
        
        # 分析现有门店
        df_stores = analyze_existing_stores()
        
        # 获取选址数据
        df_sites = get_site_evaluation_data()
        
        if df_stores.empty or df_sites.empty:
            logger.warning("⚠️ 没有足够的数据进行选址分析")
            return
        
        # 计算选址评分
        df_scores = calculate_site_scores(df_stores, df_sites)
        
        if df_scores.empty:
            logger.warning("⚠️ 没有选址评分结果")
            return
        
        # 写入评估结果
        logger.info("💾 开始写入选址评估结果...")
        success = to_sql(df_scores, "dbo.site_evaluation", "hotdog2030", if_exists='append')
        
        if success:
            # 验证结果
            count = get_table_count("hotdog2030", "site_evaluation")
            logger.info(f"🎉 ETL步骤09完成! 选址评估表现在有 {count} 条记录")
            
            # 输出统计信息
            recommendation_stats = df_scores['recommendation'].value_counts()
            logger.info(f"📊 选址评估统计:")
            for rec, count in recommendation_stats.items():
                logger.info(f"   - {rec}: {count} 个地址")
            
            logger.info(f"   - 平均评分: {df_scores['final_score'].mean():.2f}")
            logger.info(f"   - 最高评分: {df_scores['final_score'].max():.2f}")
            logger.info(f"   - 推荐地址: {len(df_scores[df_scores['recommendation'].isin(['强烈推荐', '推荐'])])} 个")
        else:
            logger.error("❌ 数据写入失败")
            
    except Exception as e:
        logger.error(f"❌ ETL步骤09执行失败: {str(e)}")
        raise

if __name__ == "__main__":
    main()
