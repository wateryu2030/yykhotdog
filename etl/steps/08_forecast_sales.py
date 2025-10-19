"""
ETL步骤08: 销售预测模块
基于历史数据预测未来销售趋势
"""
import sys
import os
import pandas as pd
import numpy as np
import datetime as dt
from pathlib import Path
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

# 添加lib路径
sys.path.append(str(Path(__file__).parent.parent))
from lib.mssql import fetch_df, to_sql, get_table_count, execute_sql
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def prepare_sales_data():
    """准备销售数据"""
    logger.info("📊 开始准备销售数据...")
    
    # 获取历史销售数据
    sql = """
    SELECT 
        o.store_id,
        s.store_name,
        s.city,
        s.province,
        o.total_amount,
        o.created_at,
        DATEPART(year, o.created_at) as year,
        DATEPART(month, o.created_at) as month,
        DATEPART(day, o.created_at) as day,
        DATEPART(weekday, o.created_at) as weekday
    FROM orders o
    JOIN stores s ON o.store_id = s.id
    WHERE o.total_amount > 0
    AND o.created_at >= DATEADD(month, -24, GETDATE())
    """
    
    df = fetch_df(sql, "hotdog2030")
    
    if df.empty:
        logger.warning("⚠️ 没有销售数据")
        return pd.DataFrame()
    
    # 数据预处理
    df['created_at'] = pd.to_datetime(df['created_at'])
    df['date'] = df['created_at'].dt.date
    
    # 按日期和门店聚合
    daily_sales = df.groupby(['store_id', 'date']).agg({
        'total_amount': 'sum',
        'created_at': 'count'
    }).reset_index()
    daily_sales.columns = ['store_id', 'date', 'revenue', 'order_count']
    
    # 添加时间特征
    daily_sales['date'] = pd.to_datetime(daily_sales['date'])
    daily_sales['year'] = daily_sales['date'].dt.year
    daily_sales['month'] = daily_sales['date'].dt.month
    daily_sales['day'] = daily_sales['date'].dt.day
    daily_sales['weekday'] = daily_sales['date'].dt.weekday
    daily_sales['quarter'] = daily_sales['date'].dt.quarter
    
    # 计算移动平均
    daily_sales = daily_sales.sort_values(['store_id', 'date'])
    daily_sales['revenue_ma7'] = daily_sales.groupby('store_id')['revenue'].rolling(window=7).mean().reset_index(0, drop=True)
    daily_sales['revenue_ma30'] = daily_sales.groupby('store_id')['revenue'].rolling(window=30).mean().reset_index(0, drop=True)
    
    logger.info(f"✅ 销售数据准备完成: {len(daily_sales)} 条记录")
    return daily_sales

def forecast_sales(df_sales):
    """销售预测"""
    logger.info("🔮 开始销售预测...")
    
    forecasts = []
    
    for store_id in df_sales['store_id'].unique():
        store_data = df_sales[df_sales['store_id'] == store_id].copy()
        
        if len(store_data) < 30:  # 数据不足，跳过
            continue
        
        # 准备特征
        features = ['month', 'day', 'weekday', 'quarter', 'revenue_ma7', 'revenue_ma30']
        X = store_data[features].fillna(0)
        y = store_data['revenue']
        
        # 训练模型
        model = LinearRegression()
        model.fit(X, y)
        
        # 预测未来30天
        last_date = store_data['date'].max()
        future_dates = pd.date_range(start=last_date + dt.timedelta(days=1), periods=30, freq='D')
        
        for i, future_date in enumerate(future_dates):
            # 构建预测特征
            pred_features = np.array([[
                future_date.month,
                future_date.day,
                future_date.weekday(),
                future_date.quarter,
                store_data['revenue_ma7'].iloc[-1] if not store_data['revenue_ma7'].isna().all() else 0,
                store_data['revenue_ma30'].iloc[-1] if not store_data['revenue_ma30'].isna().all() else 0
            ]])
            
            predicted_revenue = model.predict(pred_features)[0]
            
            forecasts.append({
                'store_id': store_id,
                'forecast_date': future_date,
                'predicted_revenue': max(0, predicted_revenue),  # 确保非负
                'confidence_level': min(0.9, max(0.1, 1 - i/30)),  # 置信度递减
                'model_type': 'LinearRegression'
            })
    
    df_forecasts = pd.DataFrame(forecasts)
    logger.info(f"✅ 销售预测完成: {len(df_forecasts)} 条预测")
    return df_forecasts

def create_forecast_table():
    """创建预测表"""
    logger.info("📋 创建销售预测表...")
    
    create_table_sql = """
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sales_forecast' AND xtype='U')
    CREATE TABLE sales_forecast (
        id int IDENTITY(1,1) PRIMARY KEY,
        store_id int,
        forecast_date date,
        predicted_revenue decimal(18,2),
        confidence_level decimal(3,2),
        model_type nvarchar(50),
        created_at datetime2 DEFAULT GETDATE()
    )
    """
    
    execute_sql(create_table_sql, "hotdog2030")
    logger.info("✅ 销售预测表创建完成")

def main():
    """主函数"""
    logger.info("🚀 开始ETL步骤08: 销售预测")
    
    try:
        # 创建预测表
        create_forecast_table()
        
        # 准备数据
        df_sales = prepare_sales_data()
        
        if df_sales.empty:
            logger.warning("⚠️ 没有销售数据可预测")
            return
        
        # 进行预测
        df_forecasts = forecast_sales(df_sales)
        
        if df_forecasts.empty:
            logger.warning("⚠️ 没有预测结果")
            return
        
        # 写入预测结果
        logger.info("💾 开始写入销售预测结果...")
        success = to_sql(df_forecasts, "dbo.sales_forecast", "hotdog2030", if_exists='append')
        
        if success:
            # 验证结果
            count = get_table_count("hotdog2030", "sales_forecast")
            logger.info(f"🎉 ETL步骤08完成! 销售预测表现在有 {count} 条记录")
            
            # 输出统计信息
            logger.info(f"📊 销售预测统计:")
            logger.info(f"   - 预测门店数: {df_forecasts['store_id'].nunique()}")
            logger.info(f"   - 预测天数: {df_forecasts['forecast_date'].nunique()}")
            logger.info(f"   - 平均预测收入: {df_forecasts['predicted_revenue'].mean():.2f}")
            logger.info(f"   - 平均置信度: {df_forecasts['confidence_level'].mean():.2f}")
        else:
            logger.error("❌ 数据写入失败")
            
    except Exception as e:
        logger.error(f"❌ ETL步骤08执行失败: {str(e)}")
        raise

if __name__ == "__main__":
    main()
