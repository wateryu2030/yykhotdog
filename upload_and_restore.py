#!/usr/bin/env python3
"""
上传备份文件到OSS并使用阿里云CLI恢复数据库
"""
import os
import sys
import oss2
from pathlib import Path

# OSS配置
access_key_id = 'LTAI5t7ducEY4P89fCzZyXWx'
access_key_secret = 'xCUS1ftOEBa7UOuuelLqX57kliWGGn'
oss_endpoint = 'https://oss-cn-hangzhou.aliyuncs.com'
bucket_name = 'yykhotdog-backup-temp'

# 备份文件
backup_dir = Path("/Users/apple/Ahope/yykhotdog/database")
backup_files = [
    ('cyrg20251117.bak', 'cyrg2025'),
    ('zhkj20251117.bak', 'cyrgweixin')
]

def upload_to_oss():
    """上传备份文件到OSS"""
    print("🚀 开始上传备份文件到OSS...")
    print("=" * 60)
    
    # 初始化OSS客户端
    auth = oss2.Auth(access_key_id, access_key_secret)
    bucket = oss2.Bucket(auth, oss_endpoint, bucket_name)
    
    uploaded_files = []
    
    for local_filename, db_name in backup_files:
        local_file = backup_dir / local_filename
        
        if not local_file.exists():
            print(f"❌ 备份文件不存在: {local_file}")
            return False
        
        oss_key = f"backups/{local_filename}"
        file_size_mb = local_file.stat().st_size / (1024*1024)
        
        print(f"\n📤 上传 {local_filename} ({file_size_mb:.1f} MB)...")
        
        try:
            # 分块上传大文件
            with open(local_file, 'rb') as f:
                result = bucket.put_object(oss_key, f.read())
                print(f"✅ {local_filename} 上传成功")
                uploaded_files.append((oss_key, db_name))
        except Exception as e:
            print(f"❌ 上传失败: {e}")
            return False
    
    print("\n" + "=" * 60)
    print("✅ 所有备份文件上传完成！")
    print("\n📋 下一步：在阿里云控制台恢复数据库")
    print("-" * 60)
    print("\n恢复命令已保存到: restore_commands.txt")
    
    # 生成恢复命令
    generate_restore_commands(uploaded_files)
    
    return True

def generate_restore_commands(uploaded_files):
    """生成恢复命令文件"""
    commands = """# 数据库恢复命令
# 复制以下命令到终端执行

# 1. 检查RDS实例状态
aliyun rds DescribeDBInstances --DBInstanceId rm-uf660d00xovkm30678o --RegionId cn-hangzhou

# 2. 恢复cyrg2025数据库
# 注意：从OSS恢复需要先在阿里云控制台操作
# 访问: https://rds.console.aliyun.com
# 步骤：
#   a. 选择实例: rm-uf660d00xovkm30678o
#   b. 进入"备份恢复" -> "数据恢复"
#   c. 选择"从OSS恢复"
#   d. 选择备份文件: oss://yykhotdog-backup-temp/backups/cyrg20251117.bak
#   e. 恢复为数据库: cyrg2025
#   f. 执行恢复

# 3. 恢复cyrgweixin数据库  
#   a. 选择实例: rm-uf660d00xovkm30678o
#   b. 进入"备份恢复" -> "数据恢复"
#   c. 选择"从OSS恢复"
#   d. 选择备份文件: oss://yykhotdog-backup-temp/backups/zhkj20251117.bak
#   e. 恢复为数据库: cyrgweixin
#   f. 执行恢复

# 4. 验证恢复结果
aliyun rds DescribeDatabases --DBInstanceId rm-uf660d00xovkm30678o --DBName cyrg2025
aliyun rds DescribeDatabases --DBInstanceId rm-uf660d00xovkm30678o --DBName cyrgweixin

# OSS备份文件位置：
"""
    
    for oss_key, db_name in uploaded_files:
        commands += f"# - {db_name}: oss://{bucket_name}/{oss_key}\n"
    
    with open('restore_commands.txt', 'w') as f:
        f.write(commands)
    
    print("恢复命令:")
    print(commands)

if __name__ == "__main__":
    success = upload_to_oss()
    sys.exit(0 if success else 1)

