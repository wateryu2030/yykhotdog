#!/usr/bin/env python3
"""
使用阿里云CLI和Python结合恢复数据库
从本地备份文件恢复到RDS数据库
"""
import os
import subprocess
import sys
from pathlib import Path

class DatabaseRestore:
    def __init__(self):
        # 阿里云配置
        self.region = 'cn-hangzhou'
        self.rds_instance_id = 'rm-uf660d00xovkm30678o'
        self.oss_bucket = 'yykhotdog-backup'
        
        # 备份文件
        self.backup_dir = Path("/Users/apple/Ahope/yykhotdog/database")
        self.cyrg_backup = self.backup_dir / "cyrg2025-10-27.bak"
        self.zhkj_backup = self.backup_dir / "zhkj2025-10-27.bak"
        
        # 目标数据库
        self.databases = {
            'cyrg2025': 'cyrg2025',
            'zhkj2025': 'cyrgweixin'
        }
    
    def check_dependencies(self):
        """检查依赖"""
        print("🔍 检查依赖...")
        
        # 检查aliyun CLI
        try:
            result = subprocess.run(['aliyun', '--version'], 
                                  capture_output=True, text=True)
            print(f"✅ 阿里云CLI已安装: {result.stdout.strip()}")
        except FileNotFoundError:
            print("❌ 未安装阿里云CLI")
            print("请安装: brew install aliyun-cli")
            return False
        
        # 检查备份文件
        print("\n📁 检查备份文件...")
        for db, backup in [('cyrg2025', self.cyrg_backup), 
                          ('zhkj2025', self.zhkj_backup)]:
            if backup.exists():
                size_mb = backup.stat().st_size / (1024*1024)
                print(f"✅ {db}: {backup.name} ({size_mb:.1f} MB)")
            else:
                print(f"❌ {db}: {backup} 不存在")
                return False
        
        return True
    
    def upload_to_oss(self):
        """上传备份文件到OSS"""
        print("\n📤 上传备份文件到OSS...")
        
        files = [
            (self.cyrg_backup, 'cyrg2025-10-27.bak'),
            (self.zhkj_backup, 'zhkj2025-10-27.bak')
        ]
        
        for local_file, oss_key in files:
            try:
                cmd = [
                    'aliyun', 'oss', 'cp',
                    str(local_file),
                    f'oss://{self.oss_bucket}/backups/{oss_key}'
                ]
                print(f"📤 上传 {local_file.name}...")
                result = subprocess.run(cmd, check=True, capture_output=True, text=True)
                print(f"✅ {local_file.name} 上传成功")
            except subprocess.CalledProcessError as e:
                print(f"❌ 上传失败: {e}")
                print(f"错误输出: {e.stderr}")
                return False
        
        return True
    
    def create_restore_instructions(self):
        """创建恢复说明"""
        print("\n📋 生成恢复说明...")
        
        instructions = f"""
# 🗄️ 数据库恢复说明

## 备份文件已上传到OSS

备份文件位置：
- cyrg2025: oss://{self.oss_bucket}/backups/cyrg2025-10-27.bak
- cyrgweixin: oss://{self.oss_bucket}/backups/zhkj2025-10-27.bak

## 🚀 手动恢复步骤

### 1. 登录阿里云控制台
https://rds.console.aliyun.com

### 2. 选择实例
实例ID: {self.rds_instance_id}

### 3. 进入数据恢复页面
- 点击 "备份恢复" 标签
- 选择 "数据恢复"

### 4. 从OSS恢复数据库
- 选择 "从OSS恢复"
- 选择备份文件:
  * cyrg2025-10-27.bak → 恢复为 cyrg2025
  * zhkj2025-10-27.bak → 恢复为 cyrgweixin

### 5. 确认并执行恢复

### 6. 验证恢复结果
恢复完成后，检查数据库是否包含数据

## 📝 验证命令
恢复完成后可以检查数据：
- 连接地址: rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com
- 用户名: hotdog
- 密码: Zhkj@62102218
"""
        
        with open('RESTORE_INSTRUCTIONS.txt', 'w') as f:
            f.write(instructions)
        
        print("✅ 恢复说明已保存到: RESTORE_INSTRUCTIONS.txt")
    
    def run(self):
        """执行主流程"""
        print("🚀 阿里云RDS数据库恢复工具")
        print("=" * 60)
        
        # 检查依赖
        if not self.check_dependencies():
            return False
        
        # 上传到OSS
        if not self.upload_to_oss():
            print("\n⚠️ 上传失败，但可以手动上传")
            print("\n手动上传命令：")
            print(f"aliyun oss cp {self.cyrg_backup} oss://{self.oss_bucket}/backups/cyrg2025-10-27.bak")
            print(f"aliyun oss cp {self.zhkj_backup} oss://{self.oss_bucket}/backups/zhkj2025-10-27.bak")
        
        # 生成恢复说明
        self.create_restore_instructions()
        
        print("\n" + "=" * 60)
        print("✅ 准备完成！")
        print("\n下一步：")
        print("1. 查看 RESTORE_INSTRUCTIONS.txt 获取详细步骤")
        print("2. 登录阿里云控制台进行数据库恢复")
        print("3. 恢复完成后验证数据")
        
        return True

if __name__ == "__main__":
    restore = DatabaseRestore()
    success = restore.run()
    sys.exit(0 if success else 1)

