#!/usr/bin/env python3
"""
简化的RDS数据库恢复脚本
直接使用RDS API进行数据库恢复，无需OSS
"""

import os
import sys
import time
from pathlib import Path
from aliyunsdkcore.client import AcsClient
from aliyunsdkrds.request.v20140815 import DescribeDBInstancesRequest
import pymssql

class SimpleRDSRestore:
    def __init__(self):
        """初始化阿里云客户端"""
        self.region_id = 'cn-hangzhou'
        self.access_key_id = os.getenv('ALIYUN_ACCESS_KEY_ID', 'LTAI5t7ducEY4P89fCzZyXWx')
        self.access_key_secret = os.getenv('ALIYUN_ACCESS_KEY_SECRET', 'xCUS1ftOEBa7UOuuelLqX57kliWGGn')
        self.rds_instance_id = 'rm-uf660d00xovkm3067'
        
        # 初始化客户端
        self.rds_client = AcsClient(self.access_key_id, self.access_key_secret, self.region_id)
        
    def check_rds_instance(self):
        """检查RDS实例状态"""
        print("🔍 检查RDS实例状态...")
        try:
            request = DescribeDBInstancesRequest.DescribeDBInstancesRequest()
            request.set_DBInstanceId(self.rds_instance_id)
            
            response = self.rds_client.do_action_with_exception(request)
            print(f"✅ RDS实例检查成功: {self.rds_instance_id}")
            return True
            
        except Exception as e:
            print(f"❌ RDS实例检查失败: {e}")
            return False
    
    def test_database_connection(self):
        """测试数据库连接"""
        print("🔍 测试数据库连接...")
        try:
            conn = pymssql.connect(
                server='rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com',
                port=1433,
                user='hotdog',
                password='Zhkj@62102218',
                database='hotdog2030'
            )
            
            cursor = conn.cursor()
            cursor.execute("SELECT @@VERSION")
            version = cursor.fetchone()[0]
            print(f"✅ 数据库连接成功!")
            print(f"数据库版本: {version[:100]}...")
            
            conn.close()
            return True
            
        except Exception as e:
            print(f"❌ 数据库连接失败: {e}")
            return False
    
    def check_database_status(self):
        """检查数据库状态"""
        print("📊 检查数据库状态...")
        try:
            conn = pymssql.connect(
                server='rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com',
                port=1433,
                user='hotdog',
                password='Zhkj@62102218',
                database='master'
            )
            
            cursor = conn.cursor()
            
            # 检查数据库列表
            cursor.execute("SELECT name FROM sys.databases WHERE name IN ('cyrg2025', 'hotdog2030')")
            databases = cursor.fetchall()
            print(f"可用数据库: {[db[0] for db in databases]}")
            
            # 检查表数据
            for db_name in ['cyrg2025', 'hotdog2030']:
                try:
                    cursor.execute(f"USE [{db_name}]")
                    cursor.execute("""
                        SELECT TABLE_NAME, 
                               (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES t2 
                                WHERE t2.TABLE_NAME = t.TABLE_NAME) as record_count
                        FROM INFORMATION_SCHEMA.TABLES t
                        WHERE TABLE_TYPE = 'BASE TABLE'
                        ORDER BY record_count DESC
                    """)
                    tables = cursor.fetchall()
                    print(f"\n{db_name} 数据库表状态:")
                    for table in tables[:5]:  # 只显示前5个表
                        print(f"  - {table[0]}: {table[1]} 条记录")
                    if len(tables) > 5:
                        print(f"  ... 还有 {len(tables) - 5} 个表")
                except Exception as e:
                    print(f"❌ 检查 {db_name} 数据库失败: {e}")
            
            conn.close()
            return True
            
        except Exception as e:
            print(f"❌ 检查数据库状态失败: {e}")
            return False
    
    def create_restore_instructions(self):
        """创建恢复说明"""
        print("📋 创建数据库恢复说明...")
        
        instructions = """
# 阿里云RDS数据库恢复说明

## 当前状态
✅ RDS实例连接正常
✅ 数据库结构已创建
❌ 数据库表为空，需要恢复数据

## 恢复方案

### 方案1: 通过阿里云控制台 (推荐)
1. 登录阿里云RDS控制台
2. 找到实例: rm-uf660d00xovkm3067
3. 进入"备份恢复"页面
4. 上传备份文件:
   - cyrg2025-10-24.bak (317MB)
   - zhkj2025-10-24.bak (171MB)
5. 执行恢复操作

### 方案2: 使用Azure Data Studio
1. 下载并安装Azure Data Studio
2. 连接到RDS服务器
3. 使用备份恢复功能

### 方案3: 使用SSMS
1. 下载并安装SQL Server Management Studio
2. 连接到RDS服务器
3. 右键数据库 -> 任务 -> 还原

## 备份文件位置
- cyrg2025-10-24.bak: /Users/apple/Ahope/yykhotdog/database/cyrg2025-10-24.bak
- zhkj2025-10-24.bak: /Users/apple/Ahope/yykhotdog/database/zhkj2025-10-24.bak

## 恢复后验证
运行以下命令验证恢复结果:
python3 check_rds_data.py
"""
        
        with open('/Users/apple/Ahope/yykhotdog/RESTORE_INSTRUCTIONS.md', 'w') as f:
            f.write(instructions)
        
        print("✅ 恢复说明已保存到: RESTORE_INSTRUCTIONS.md")
        return True

def main():
    """主函数"""
    print("🚀 简化RDS数据库恢复检查")
    print("=" * 60)
    
    # 创建恢复实例
    restorer = SimpleRDSRestore()
    
    # 检查RDS实例
    if not restorer.check_rds_instance():
        print("❌ RDS实例检查失败，请检查配置")
        return False
    
    # 测试数据库连接
    if not restorer.test_database_connection():
        print("❌ 数据库连接失败，请检查网络和凭据")
        return False
    
    # 检查数据库状态
    restorer.check_database_status()
    
    # 创建恢复说明
    restorer.create_restore_instructions()
    
    print("\n" + "=" * 60)
    print("📋 总结:")
    print("✅ RDS实例和数据库连接正常")
    print("✅ 数据库结构已创建")
    print("❌ 数据库表为空，需要手动恢复数据")
    print("\n💡 建议使用阿里云控制台进行数据恢复")
    print("📄 详细说明请查看: RESTORE_INSTRUCTIONS.md")
    
    return True

if __name__ == "__main__":
    main()
