"""
ETL步骤07: 客户分群（RFM）
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

def load_rfm():
    """加载RFM数据"""
    logger.info("📊 开始加载RFM数据...")
    
    sql = """
    SELECT
      o.customer_id,
      MAX(CONVERT(int, FORMAT(o.created_at,'yyyyMMdd'))) AS last_date_key,
      COUNT(*) AS freq,
      SUM(o.total_amount) AS monetary
    FROM dbo.orders o
    WHERE o.customer_id IS NOT NULL
    GROUP BY o.customer_id
    """
    
    df = fetch_df(sql, DW)
    logger.info(f"✅ RFM数据加载完成: {len(df)} 个客户")
    return df

def qcut_to_score(s, q=5, ascending=True):
    """分位数评分：1 ~ q"""
    s = s.rank(method='first', ascending=ascending)  # 防止重复边界
    bins = np.linspace(0, s.max(), q+1)
    labels = list(range(1, q+1))
    return pd.cut(s, bins=bins, labels=labels, include_lowest=True).astype(int)

def main():
    """主函数"""
    logger.info("🚀 开始ETL步骤07: 客户分群（RFM）")
    
    try:
        # 加载RFM数据
        df = load_rfm()
        
        if df.empty:
            logger.warning("⚠️ 没有客户数据可分析")
            return
        
        # R 越新越好：last_date_key 越大评分越高
        df['r_score'] = qcut_to_score(df['last_date_key'], q=5, ascending=True)
        # F/M 越大越好
        df['f_score'] = qcut_to_score(df['freq'], q=5, ascending=False)
        df['m_score'] = qcut_to_score(df['monetary'], q=5, ascending=False)
        df['segment_code'] = df['r_score']*100 + df['f_score']*10 + df['m_score']
        
        out = df[['customer_id','r_score','f_score','m_score','segment_code']].copy()
        
        # 写入数据库
        logger.info("💾 开始写入客户分群结果...")
        
        with get_conn(DW) as conn:
            cur = conn.cursor()
            success_count = 0
            
            for _,r in out.iterrows():
                try:
                    cur.execute("""
MERGE dbo.dim_customer_segment AS T
USING (SELECT ? AS customer_id) AS S
ON (T.customer_id=S.customer_id)
WHEN MATCHED THEN UPDATE SET r_score=?, f_score=?, m_score=?, segment_code=?, updated_at=sysutcdatetime()
WHEN NOT MATCHED THEN INSERT (customer_id, r_score, f_score, m_score, segment_code)
VALUES (S.customer_id, ?, ?, ?, ?);
""", 
                        r['customer_id'], 
                        int(r['r_score']), 
                        int(r['f_score']), 
                        int(r['m_score']), 
                        int(r['segment_code']),
                        int(r['r_score']), 
                        int(r['f_score']), 
                        int(r['m_score']), 
                        int(r['segment_code'])
                    )
                    success_count += 1
                except Exception as e:
                    logger.warning(f"⚠️ 跳过客户分群: {str(e)}")
                    continue
            
            conn.commit()
            logger.info(f"✅ 客户分群数据更新完成: {success_count} 个客户")
        
        # 验证结果
        count = get_table_count(DW, "dim_customer_segment")
        logger.info(f"🎉 ETL步骤07完成! dim_customer_segment表现在有 {count} 条记录")
        
        # 输出统计信息
        logger.info(f"📊 客户分群统计:")
        logger.info(f"   - 处理客户数: {len(out)}")
        logger.info(f"   - 平均R评分: {out['r_score'].mean():.2f}")
        logger.info(f"   - 平均F评分: {out['f_score'].mean():.2f}")
        logger.info(f"   - 平均M评分: {out['m_score'].mean():.2f}")
        
        # 分群分布
        segment_dist = out['segment_code'].value_counts().head(10)
        logger.info(f"   - 主要分群分布:")
        for segment, count in segment_dist.items():
            logger.info(f"     {segment}: {count} 人")
            
    except Exception as e:
        logger.error(f"❌ ETL步骤07执行失败: {str(e)}")
        raise

if __name__ == "__main__":
    main()
