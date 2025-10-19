"""
ETL步骤08: 销量/营收预测
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
HORIZON = 7  # 预测未来7天

def load_store_daily():
    """加载门店每日销售数据"""
    logger.info("📊 开始加载门店每日销售数据...")
    
    sql = """
    SELECT date_key, store_id, revenue
    FROM dbo.vw_sales_store_daily
    """
    
    df = fetch_df(sql, DW)
    logger.info(f"✅ 门店每日销售数据加载完成: {len(df)} 条记录")
    return df

def make_features(df):
    """创建特征工程"""
    logger.info("🔧 开始特征工程...")
    
    df = df.copy()
    df['date'] = pd.to_datetime(df['date_key'].astype(str))
    df = df.sort_values(['store_id','date'])
    
    # 移动平均特征
    for w in [7,14,28]:
        df[f'rev_ma_{w}'] = df.groupby('store_id')['revenue'].transform(lambda s: s.rolling(w, min_periods=1).mean())
    
    # 时间特征
    df['dow'] = df['date'].dt.weekday
    
    df = df.dropna()
    logger.info(f"✅ 特征工程完成: {len(df)} 条记录")
    return df

def forecast_per_store(g):
    """为单个门店生成预测"""
    try:
        # 尝试使用XGBoost
        from xgboost import XGBRegressor
        MODEL = "xgboost"
    except Exception:
        # 回退到sklearn
        from sklearn.ensemble import HistGradientBoostingRegressor
        def XGBRegressor(**kw): return HistGradientBoostingRegressor()
        MODEL = "hgb"
    
    X = g[['rev_ma_7','rev_ma_14','rev_ma_28','dow']]
    y = g['revenue']
    
    model = XGBRegressor(n_estimators=300, max_depth=6, learning_rate=0.05)
    model.fit(X, y)
    
    # 逐日滚动预测简单版：用最后一日特征近似
    last = g.iloc[-1:].copy()
    preds = []
    base_date = pd.to_datetime(str(int(last['date_key'].iloc[0])), format='%Y%m%d')
    ma7, ma14, ma28 = last[['rev_ma_7','rev_ma_14','rev_ma_28']].values[0]
    
    for i in range(1, HORIZON+1):
        d = base_date + dt.timedelta(days=i)
        dow = d.weekday()
        Xf = [[ma7, ma14, ma28, dow]]
        yhat = float(model.predict(Xf)[0])
        preds.append((int(d.strftime('%Y%m%d')), int(g['store_id'].iloc[0]), yhat))
        
        # 简单滚动：把预测纳入 ma7/14/28
        ma7 = (ma7*6 + yhat)/7
        ma14 = (ma14*13 + yhat)/14
        ma28 = (ma28*27 + yhat)/28
    
    return preds

def write_preds(rows):
    """写入预测结果"""
    if not rows: 
        logger.warning("⚠️ 没有预测结果可写入")
        return
    
    logger.info("💾 开始写入预测结果...")
    
    try:
        from xgboost import XGBRegressor
        MODEL = "xgboost"
    except Exception:
        MODEL = "hgb"
    
    with get_conn(DW) as conn:
        cur = conn.cursor()
        success_count = 0
        
        for date_key, store_id, yhat in rows:
            try:
                cur.execute("""
MERGE dbo.fact_forecast_daily AS T
USING (SELECT ? AS date_key, ? AS store_id) AS S
ON (T.date_key=S.date_key AND T.store_id=S.store_id)
WHEN MATCHED THEN UPDATE SET yhat=?, model_name=?, created_at=sysutcdatetime()
WHEN NOT MATCHED THEN INSERT (date_key, store_id, yhat, model_name) VALUES (?, ?, ?, ?);
""", 
                    date_key, store_id, yhat, MODEL, date_key, store_id, yhat, MODEL
                )
                success_count += 1
            except Exception as e:
                logger.warning(f"⚠️ 跳过预测写入: {str(e)}")
                continue
        
        conn.commit()
        logger.info(f"✅ 预测结果写入完成: {success_count} 条记录")

def main():
    """主函数"""
    logger.info("🚀 开始ETL步骤08: 销量/营收预测")
    
    try:
        # 加载门店每日销售数据
        df = load_store_daily()
        
        if df.empty:
            logger.warning("⚠️ 没有销售数据可预测")
            return
        
        # 特征工程
        df = make_features(df)
        
        if df.empty:
            logger.warning("⚠️ 特征工程后没有数据可预测")
            return
        
        # 为每个门店生成预测
        all_preds = []
        for _, g in df.groupby('store_id'):
            if len(g) < 30:  # 数据太少跳过
                continue
            all_preds += forecast_per_store(g)
        
        # 写入预测结果
        write_preds(all_preds)
        
        # 验证结果
        count = get_table_count(DW, "fact_forecast_daily")
        logger.info(f"🎉 ETL步骤08完成! fact_forecast_daily表现在有 {count} 条记录")
        
        # 输出统计信息
        logger.info(f"📊 销售预测统计:")
        logger.info(f"   - 预测记录数: {len(all_preds)}")
        if all_preds:
            avg_pred = np.mean([pred[2] for pred in all_preds])
            logger.info(f"   - 平均预测金额: {avg_pred:.2f}")
            logger.info(f"   - 预测门店数: {len(set([pred[1] for pred in all_preds]))}")
            
    except Exception as e:
        logger.error(f"❌ ETL步骤08执行失败: {str(e)}")
        raise

if __name__ == "__main__":
    main()