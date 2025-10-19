"""
ETL步骤09: 选址评分
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

WX = "cyrgweixin"
DW = "hotdog2030"

def load_candidates():
    """加载选址候选点数据"""
    logger.info("📊 开始加载选址候选点数据...")
    
    # 选址候选：Rg_SeekShop
    sql = "SELECT Id AS candidate_id, ShopName AS name, ShopAddress AS address, location, amount, RecordTime FROM Rg_SeekShop WHERE Delflag=0"
    
    df = fetch_df(sql, WX)
    logger.info(f"✅ 选址候选点数据加载完成: {len(df)} 个候选点")
    return df

def city_perf():
    """获取城市表现数据"""
    logger.info("📊 开始加载城市表现数据...")
    
    sql = """
    SELECT s.city, AVG(d.revenue) AS city_avg_revenue
    FROM dbo.stores s
    JOIN dbo.vw_sales_store_daily d ON d.store_id = s.id
    GROUP BY s.city
    """
    
    df = fetch_df(sql, DW)
    logger.info(f"✅ 城市表现数据加载完成: {len(df)} 个城市")
    return df

def store_density():
    """获取门店密度数据"""
    logger.info("📊 开始加载门店密度数据...")
    
    sql = "SELECT city, COUNT(*) AS store_cnt FROM dbo.stores GROUP BY city"
    
    df = fetch_df(sql, DW)
    logger.info(f"✅ 门店密度数据加载完成: {len(df)} 个城市")
    return df

def main():
    """主函数"""
    logger.info("🚀 开始ETL步骤09: 选址评分")
    
    try:
        # 加载候选点数据
        cand = load_candidates()
        
        if cand.empty:
            logger.warning("⚠️ 没有候选选址点数据")
            return
        
        # 加载城市表现和密度数据
        perf = city_perf()
        dens = store_density()
        
        # 合并数据
        df = cand.merge(perf, how='left', left_on=None, right_on=None)
        
        # 粗略城市提取：从 address 或 name 中提取城市关键词（示例简化）
        df['city'] = df['address'].str.slice(0,2)  # 你可替换为更准确的城市解析
        df = df.merge(perf, how='left', on='city').merge(dens, how='left', on='city')
        
        # 规则：match_score 高=好（有城市均值→给较高基础分）
        df['match_score'] = df['city_avg_revenue'].fillna(df['city_avg_revenue'].median() if 'city_avg_revenue' in df else 0)
        
        # 规则：同城门店越多，蚕食越高（0~1 之间）
        max_cnt = df['store_cnt'].max() if 'store_cnt' in df and df['store_cnt'].notna().any() else 1
        df['cannibal_score'] = (df['store_cnt'] / max_cnt).fillna(0)
        
        # 归一化
        if df['match_score'].max() > 0:
            df['match_score'] = df['match_score'] / df['match_score'].max()
        
        df['total_score'] = 0.6*df['match_score'] + 0.4*(1 - df['cannibal_score'])
        df['rationale'] = "同城历史营收匹配 + 门店密度校正（越稀疏越优）"
        
        # 准备输出数据
        out = df[['candidate_id','city','match_score','cannibal_score','total_score','rationale']].copy()
        
        # 写入数据库
        logger.info("💾 开始写入选址评分结果...")
        success = to_sql(out, "dbo.fact_site_score", DW, if_exists='append')
        
        if success:
            # 验证结果
            count = get_table_count(DW, "fact_site_score")
            logger.info(f"🎉 ETL步骤09完成! fact_site_score表现在有 {count} 条记录")
            
            # 输出统计信息
            logger.info(f"📊 选址评分统计:")
            logger.info(f"   - 分析候选点数: {len(out)}")
            logger.info(f"   - 平均匹配评分: {out['match_score'].mean():.4f}")
            logger.info(f"   - 平均蚕食评分: {out['cannibal_score'].mean():.4f}")
            logger.info(f"   - 平均总评分: {out['total_score'].mean():.4f}")
            
            # 输出高分候选点
            top_candidates = out.nlargest(5, 'total_score')
            logger.info(f"   - 高分候选点:")
            for _, candidate in top_candidates.iterrows():
                logger.info(f"     ID {candidate['candidate_id']}: {candidate['total_score']:.4f}")
        else:
            logger.error("❌ 数据写入失败")
            
    except Exception as e:
        logger.error(f"❌ ETL步骤09执行失败: {str(e)}")
        raise

if __name__ == "__main__":
    main()