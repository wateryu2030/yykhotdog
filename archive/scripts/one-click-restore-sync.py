#!/usr/bin/env python3
"""
一键式数据恢复和同步脚本
从备份文件恢复到数据库，然后同步到hotdog2030
"""
import os
import sys
import subprocess
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_command(cmd, description):
    """执行命令并记录日志"""
    logger.info(f"🔄 {description}...")
    try:
        # 确保在正确的Python环境中运行
        python_cmd = f"python {cmd}" if not cmd.startswith('python') else cmd
        result = subprocess.run(python_cmd, shell=True, check=True, capture_output=True, text=True)
        logger.info(f"✅ {description} 完成")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ {description} 失败: {e}")
        logger.error(f"错误输出: {e.stderr}")
        return False

def main():
    """主函数"""
    logger.info("🚀 开始一键式数据恢复和同步...")
    logger.info("=" * 60)
    
    # 获取当前脚本目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. 恢复基础数据库
    logger.info("📋 步骤1: 恢复基础数据库")
    restore_script = os.path.join(script_dir, "database", "restore_from_backup.py")
    if not run_command(f"python {restore_script}", "恢复cyrg2025和cyrgweixin数据库"):
        logger.error("❌ 数据库恢复失败，终止执行")
        return False
    
    # 2. 复制地区数据
    logger.info("📋 步骤2: 复制地区级联数据")
    region_script = os.path.join(script_dir, "copy-region-data-from-rds.py")
    if not run_command(f"python {region_script}", "从RDS复制地区数据"):
        logger.error("❌ 地区数据复制失败，终止执行")
        return False
    
    # 3. 同步数据到hotdog2030
    logger.info("📋 步骤3: 同步数据到hotdog2030")
    sync_script = os.path.join(script_dir, "complete-data-sync.py")
    if not run_command(f"python {sync_script}", "同步所有数据到hotdog2030"):
        logger.error("❌ 数据同步失败，终止执行")
        return False
    
    logger.info("🎉 所有步骤完成！数据恢复和同步成功！")
    logger.info("=" * 60)
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
