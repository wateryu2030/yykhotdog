#!/usr/bin/env python3
"""
从OSS恢复数据库到RDS
使用阿里云RDS API
"""
import os
import sys
from aliyunsdkcore.client import AcsClient
from aliyunsdkrds.request.v20140815 import RestoreDatabaseRequest
from aliyunsdkrds.request.v20140815 import DescribeBackupsRequest
import time

# 阿里云配置
ACCESS_KEY_ID = 'LTAI5t7ducEY4P89fCzZyXWx'
ACCESS_KEY_SECRET = 'xCUS1ftOEBa7UOuuelLqX57kliWGGn'
REGION_ID = 'cn-hangzhou'
DB_INSTANCE_ID = 'rm-uf660d00xovkm30678o'

# OSS备份文件
BACKUP_FILES = {
    'cyrg2025': 'oss://yykhotdog-backup-temp/backups/cyrg2025-10-27.bak',
    'cyrgweixin': 'oss://yykhotdog-backup-temp/backups/zhkj2025-10-27.bak'
}

def create_restore_request(db_name, oss_backup):
    """创建数据库恢复请求"""
    print(f"\n🔄 准备恢复数据库: {db_name}")
    print(f"备份文件: {oss_backup}")
    
    try:
        request = RestoreDatabaseRequest.RestoreDatabaseRequest()
        request.set_DBInstanceId(DB_INSTANCE_ID)
        request.set_DBName(db_name)
        request.set_BackupId(oss_backup)
        request.set_RegionId(REGION_ID)
        
        return request
    except Exception as e:
        print(f"❌ 创建恢复请求失败: {e}")
        return None

def restore_database(db_name, oss_backup):
    """恢复单个数据库"""
    print(f"\n{'='*60}")
    print(f"恢复数据库: {db_name}")
    print(f"从: {oss_backup}")
    print(f"{'='*60}")
    
    try:
        # 创建客户端
        client = AcsClient(ACCESS_KEY_ID, ACCESS_KEY_SECRET, REGION_ID)
        
        # 创建请求
        request = create_restore_request(db_name, oss_backup)
        if not request:
            return False
        
        print("⏳ 正在提交恢复请求...")
        
        # 执行恢复
        response = client.do_action_with_exception(request)
        print(f"✅ 恢复请求已提交: {response}")
        
        print(f"\n📋 恢复 {db_name} 数据库已提交")
        print("⏰ 恢复可能需要几分钟时间，请耐心等待...")
        
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
    
    success_count = 0
    
    for db_name, oss_backup in BACKUP_FILES.items():
        if restore_database(db_name, oss_backup):
            success_count += 1
            print(f"\n⏳ 等待5秒后继续下一个数据库...")
            time.sleep(5)
    
    print("\n" + "=" * 60)
    print(f"📊 恢复结果: {success_count}/{len(BACKUP_FILES)} 个数据库")
    
    if success_count == len(BACKUP_FILES):
        print("✅ 所有数据库恢复请求已提交")
        print("\n📋 下一步:")
        print("1. 等待5-10分钟让恢复完成")
        print("2. 运行验证脚本检查恢复结果")
        print("3. 在阿里云控制台查看恢复进度")
        return True
    else:
        print("⚠️ 部分数据库恢复请求失败")
        print("\n💡 建议在阿里云控制台手动恢复:")
        print("   https://rds.console.aliyun.com")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

