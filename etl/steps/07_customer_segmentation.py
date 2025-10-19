"""
ETL步骤07: 客户细分分析
基于RFM模型进行客户细分，生成客户画像
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

def calculate_customer_rfm():
    """计算客户RFM指标"""
    logger.info("📊 开始计算客户RFM指标...")
    
    # 获取客户订单数据
    sql = """
    SELECT 
        c.id as customer_id,
        c.customer_name,
        c.phone,
        c.city,
        c.province,
        o.total_amount,
        o.created_at,
        o.store_id,
        s.store_name
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id
    LEFT JOIN stores s ON o.store_id = s.id
    WHERE o.total_amount > 0
    AND o.created_at >= DATEADD(month, -12, GETDATE())
    """
    
    df = fetch_df(sql, "hotdog2030")
    
    if df.empty:
        logger.warning("⚠️ 没有客户订单数据")
        return pd.DataFrame()
    
    # 计算RFM指标
    current_date = dt.datetime.now()
    df['order_date'] = pd.to_datetime(df['created_at'])
    
    # 按客户聚合
    customer_rfm = df.groupby('customer_id').agg({
        'order_date': ['max', 'count'],
        'total_amount': 'sum'
    }).reset_index()
    
    # 扁平化列名
    customer_rfm.columns = ['customer_id', 'last_order_date', 'frequency', 'monetary']
    
    # 计算Recency (最近购买时间)
    customer_rfm['recency'] = (current_date - customer_rfm['last_order_date']).dt.days
    
    # 获取客户基本信息
    customer_info = df[['customer_id', 'customer_name', 'phone', 'city', 'province']].drop_duplicates()
    customer_rfm = pd.merge(customer_rfm, customer_info, on='customer_id', how='left')
    
    # RFM评分 (1-5分)
    customer_rfm['R_score'] = pd.cut(customer_rfm['recency'], bins=5, labels=[5,4,3,2,1]).astype(int)
    customer_rfm['F_score'] = pd.cut(customer_rfm['frequency'], bins=5, labels=[1,2,3,4,5]).astype(int)
    customer_rfm['M_score'] = pd.cut(customer_rfm['monetary'], bins=5, labels=[1,2,3,4,5]).astype(int)
    
    # 客户细分
    def segment_customers(row):
        r, f, m = row['R_score'], row['F_score'], row['M_score']
        
        if r >= 4 and f >= 4 and m >= 4:
            return 'VIP客户'
        elif r >= 3 and f >= 3 and m >= 3:
            return '重要客户'
        elif r >= 2 and f >= 2:
            return '潜力客户'
        elif r >= 3:
            return '新客户'
        elif f >= 3:
            return '忠诚客户'
        else:
            return '流失客户'
    
    customer_rfm['customer_segment'] = customer_rfm.apply(segment_customers, axis=1)
    
    # 计算客户价值
    customer_rfm['customer_value'] = customer_rfm['R_score'] + customer_rfm['F_score'] + customer_rfm['M_score']
    
    # 添加分析时间戳
    customer_rfm['analysis_date'] = current_date
    
    logger.info(f"✅ 客户RFM分析完成: {len(customer_rfm)} 个客户")
    return customer_rfm

def create_customer_segmentation_table():
    """创建客户细分表"""
    logger.info("📋 创建客户细分表...")
    
    create_table_sql = """
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='customer_segmentation' AND xtype='U')
    CREATE TABLE customer_segmentation (
        id int IDENTITY(1,1) PRIMARY KEY,
        customer_id nvarchar(100),
        customer_name nvarchar(100),
        phone nvarchar(50),
        city nvarchar(50),
        province nvarchar(50),
        recency int,
        frequency int,
        monetary decimal(18,2),
        R_score int,
        F_score int,
        M_score int,
        customer_segment nvarchar(50),
        customer_value int,
        last_order_date datetime2,
        analysis_date datetime2,
        created_at datetime2 DEFAULT GETDATE()
    )
    """
    
    execute_sql(create_table_sql, "hotdog2030")
    logger.info("✅ 客户细分表创建完成")

def main():
    """主函数"""
    logger.info("🚀 开始ETL步骤07: 客户细分分析")
    
    try:
        # 创建细分表
        create_customer_segmentation_table()
        
        # 计算RFM分析
        df_segmentation = calculate_customer_rfm()
        
        if df_segmentation.empty:
            logger.warning("⚠️ 没有客户数据可分析")
            return
        
        # 写入分析结果
        logger.info("💾 开始写入客户细分结果...")
        success = to_sql(df_segmentation, "dbo.customer_segmentation", "hotdog2030", if_exists='append')
        
        if success:
            # 验证结果
            count = get_table_count("hotdog2030", "customer_segmentation")
            logger.info(f"🎉 ETL步骤07完成! 客户细分表现在有 {count} 条记录")
            
            # 输出统计信息
            segment_stats = df_segmentation['customer_segment'].value_counts()
            logger.info(f"📊 客户细分统计:")
            for segment, count in segment_stats.items():
                logger.info(f"   - {segment}: {count} 人")
            
            logger.info(f"   - 平均客户价值: {df_segmentation['customer_value'].mean():.2f}")
            logger.info(f"   - 最高价值客户: {df_segmentation.loc[df_segmentation['customer_value'].idxmax(), 'customer_name']}")
        else:
            logger.error("❌ 数据写入失败")
            
    except Exception as e:
        logger.error(f"❌ ETL步骤07执行失败: {str(e)}")
        raise

if __name__ == "__main__":
    main()
