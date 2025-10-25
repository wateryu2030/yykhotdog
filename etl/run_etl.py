"""
ETL主执行脚本
按顺序执行所有ETL步骤
"""
import sys
import os
import subprocess
import time
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_etl_step(step_number, step_name):
    """运行单个ETL步骤"""
    logger.info(f"🚀 开始执行ETL步骤{step_number}: {step_name}")
    
    script_path = Path(__file__).parent / "steps" / f"{step_number:02d}_{step_name}.py"
    
    if not script_path.exists():
        logger.error(f"❌ 脚本文件不存在: {script_path}")
        return False
    
    try:
        # 执行脚本
        result = subprocess.run([sys.executable, str(script_path)], 
                              capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            logger.info(f"✅ ETL步骤{step_number}执行成功")
            if result.stdout:
                logger.info(f"输出: {result.stdout}")
            return True
        else:
            logger.error(f"❌ ETL步骤{step_number}执行失败")
            if result.stderr:
                logger.error(f"错误: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        logger.error(f"❌ ETL步骤{step_number}执行超时")
        return False
    except Exception as e:
        logger.error(f"❌ ETL步骤{step_number}执行异常: {str(e)}")
        return False

def main():
    """主函数"""
    logger.info("🎯 开始执行完整ETL流程")
    start_time = time.time()
    
    # ETL步骤列表
    etl_steps = [
        (1, "extract_orders", "订单数据提取"),
        (2, "extract_order_items", "订单明细提取"),
        (3, "extract_stores", "门店信息提取"),
        (4, "extract_products", "商品信息提取"),
        (5, "extract_customers", "客户信息提取"),
        (6, "profit_analysis", "利润分析"),
        (7, "customer_segmentation", "客户细分分析"),
        (8, "forecast_sales", "销售预测"),
        (9, "site_selection", "智能选址分析"),
        (10, "dashboard_metrics", "仪表板指标聚合")
    ]
    
    success_count = 0
    failed_steps = []
    
    for step_number, step_name, step_description in etl_steps:
        logger.info(f"📋 执行步骤 {step_number}/10: {step_description}")
        
        if run_etl_step(step_number, step_name):
            success_count += 1
        else:
            failed_steps.append((step_number, step_name, step_description))
            logger.warning(f"⚠️ 步骤{step_number}失败，继续执行后续步骤")
        
        # 步骤间暂停
        time.sleep(2)
    
    # 输出执行结果
    end_time = time.time()
    execution_time = end_time - start_time
    
    logger.info("🎉 ETL流程执行完成!")
    logger.info(f"📊 执行统计:")
    logger.info(f"   - 总步骤数: {len(etl_steps)}")
    logger.info(f"   - 成功步骤: {success_count}")
    logger.info(f"   - 失败步骤: {len(failed_steps)}")
    logger.info(f"   - 执行时间: {execution_time:.2f} 秒")
    
    if failed_steps:
        logger.warning("⚠️ 失败的步骤:")
        for step_number, step_name, step_description in failed_steps:
            logger.warning(f"   - 步骤{step_number}: {step_description}")
    
    if success_count == len(etl_steps):
        logger.info("🎊 所有ETL步骤执行成功!")
    else:
        logger.warning(f"⚠️ 有 {len(failed_steps)} 个步骤执行失败，请检查日志")

if __name__ == "__main__":
    main()
