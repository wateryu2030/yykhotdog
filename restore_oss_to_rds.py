#!/usr/bin/env python3
"""
使用阿里云Python SDK从OSS恢复数据库到RDS
"""
import os
import sys
from aliyunsdkcore.client import AcsClient
from aliyunsdkcore.request import CommonRequest

# 阿里云配置
ACCESS_KEY_ID = 'LTAI5t7ducEY4P89fCzZyXWx'
ACCESS_KEY_SECRET = 'xCUS1ftOEBa7UOuuelLqX57kliWGGn'
REGION_ID = 'cn-hangzhou'
DB_INSTANCE_ID = 'rm-uf660d00xovkm30678o'

def restore_database(db_name, oss_backup_key):
    """从OSS恢复数据库"""
    print(f"\n{'='*60}")
    print(f"🔄 恢复数据库: {db_name}")
    print(f"备份文件: oss://yykhotdog-backup-temp/{oss_backup_key}")
    print(f"{'='*60}")
    
    try:
        # 创建客户端
        client = AcsClient(ACCESS_KEY_ID, ACCESS_KEY_SECRET, REGION_ID)
        
        # 创建通用请求
        request = CommonRequest()
        request.set_product('Rds')
        request.set_domain('rds.aliyuncs.com')
        request.set_version('2014-08-15')
        request.set_action_name('CreateRestoreTask')
        
        # 设置参数
        request.add_query_param('DBInstanceId', DB_INSTANCE_ID)
        request.add_query_param('BackupId', oss_backup_key)
        request.add_query_param('RestoreTime', '')
        request.add_query_param('TargetDatabaseName', db_name)
        
        print("⏳ 正在提交恢复请求...")
        response = client.do_action_with_exception(request)
        print(f"✅ 恢复请求已提交")
        print(f"响应: {response.decode('utf-8')[:200]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ 恢复失败: {e}")
        return False

def main():
    """主函数"""
    print("🚀 开始从OSS恢复数据库到RDS")
    print("=" * 60)
    print(f"RDS实例: {DB_INSTANCE_ID}")
    print(f"区域: {REGION_ID}")
    
    # 备份文件和目标数据库
    restore_tasks = [
        ('backups/cyrg20251117.bak', 'cyrg2025'),
        ('backups/zhkj20251117.bak', 'cyrgweixin')
    ]
    
    success_count = 0
    
    for oss_key, db_name in restore_tasks:
        if restore_database(db_name, oss_key):
            success_count += 1
            print(f"\n⏳ 等待10秒后继续...")
            import time
            time.sleep(10)
    
    print("\n" + "=" * 60)
    print(f"📊 恢复结果: {success_count}/{len(restore_tasks)} 个数据库")
    
    if success_count == len(restore_tasks):
        print("✅ 所有数据库恢复请求已提交")
        print("\n📋 等待5-10分钟让恢复完成，然后验证结果")
    else:
        print("⚠️ 使用阿里云控制台手动恢复")
        print("   访问: https://rds.console.aliyun.com")
    
    return success_count == len(restore_tasks)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

