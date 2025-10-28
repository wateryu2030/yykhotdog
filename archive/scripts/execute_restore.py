#!/usr/bin/env python3
"""
执行数据库恢复脚本
使用阿里云API自动执行数据库恢复操作
"""

import os
import sys
import time
from pathlib import Path
from aliyunsdkcore.client import AcsClient
from aliyunsdkrds.request.v20140815 import DescribeDBInstancesRequest
import pymssql

class ExecuteRestore:
    def __init__(self):
        """初始化"""
        self.region_id = 'cn-hangzhou'
        self.access_key_id = os.getenv('ALIYUN_ACCESS_KEY_ID', 'LTAI5t7ducEY4P89fCzZyXWx')
        self.access_key_secret = os.getenv('ALIYUN_ACCESS_KEY_SECRET', 'xCUS1ftOEBa7UOuuelLqX57kliWGGn')
        self.rds_client = AcsClient(self.access_key_id, self.access_key_secret, self.region_id)
        
    def check_backup_files(self):
        """检查备份文件"""
        print("🔍 检查备份文件...")
        backup_files = {
            'cyrg2025': '/Users/apple/Ahope/yykhotdog/database/cyrg2025-10-24.bak',
            'cyrgweixin': '/Users/apple/Ahope/yykhotdog/database/zhkj2025-10-24.bak'
        }
        
        for db_name, file_path in backup_files.items():
            if os.path.exists(file_path):
                size = os.path.getsize(file_path) / (1024*1024)  # MB
                print(f"✅ {db_name}: {file_path} ({size:.1f}MB)")
            else:
                print(f"❌ {db_name}: {file_path} 不存在")
                return False
        
        return True
    
    def create_restore_sql_scripts(self):
        """创建恢复SQL脚本"""
        print("📝 创建恢复SQL脚本...")
        
        # cyrg2025恢复脚本
        cyrg2025_sql = """
-- 恢复cyrg2025数据库
USE master;

-- 删除现有数据库（如果存在）
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    ALTER DATABASE [cyrg2025] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrg2025];
END

-- 恢复数据库
RESTORE DATABASE [cyrg2025] 
FROM DISK = '/Users/apple/Ahope/yykhotdog/database/cyrg2025-10-24.bak'
WITH REPLACE;
"""
        
        # cyrgweixin恢复脚本
        cyrgweixin_sql = """
-- 恢复cyrgweixin数据库
USE master;

-- 删除现有数据库（如果存在）
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrgweixin')
BEGIN
    ALTER DATABASE [cyrgweixin] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrgweixin];
END

-- 恢复数据库
RESTORE DATABASE [cyrgweixin] 
FROM DISK = '/Users/apple/Ahope/yykhotdog/database/zhkj2025-10-24.bak'
WITH REPLACE;
"""
        
        # 保存脚本文件
        with open('/Users/apple/Ahope/yykhotdog/restore_cyrg2025.sql', 'w') as f:
            f.write(cyrg2025_sql)
        
        with open('/Users/apple/Ahope/yykhotdog/restore_cyrgweixin.sql', 'w') as f:
            f.write(cyrgweixin_sql)
        
        print("✅ 恢复SQL脚本已创建")
        return True
    
    def execute_restore_via_sql(self):
        """通过SQL执行恢复"""
        print("🔄 执行数据库恢复...")
        
        try:
            # 连接到RDS
            conn = pymssql.connect(
                server='rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com',
                port=1433,
                user='hotdog',
                password='Zhkj@62102218',
                database='master'
            )
            cursor = conn.cursor()
            
            print("✅ 数据库连接成功")
            
            # 执行cyrg2025恢复
            print("🔄 恢复cyrg2025数据库...")
            try:
                # 删除现有数据库
                cursor.execute("IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025') DROP DATABASE [cyrg2025]")
                conn.commit()
                print("✅ cyrg2025数据库已删除")
                
                # 恢复数据库
                cursor.execute("""
                RESTORE DATABASE [cyrg2025] 
                FROM DISK = '/Users/apple/Ahope/yykhotdog/database/cyrg2025-10-24.bak'
                WITH REPLACE
                """)
                conn.commit()
                print("✅ cyrg2025数据库恢复成功")
                
            except Exception as e:
                print(f"❌ cyrg2025数据库恢复失败: {e}")
                return False
            
            # 执行cyrgweixin恢复
            print("🔄 恢复cyrgweixin数据库...")
            try:
                # 删除现有数据库
                cursor.execute("IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrgweixin') DROP DATABASE [cyrgweixin]")
                conn.commit()
                print("✅ cyrgweixin数据库已删除")
                
                # 恢复数据库
                cursor.execute("""
                RESTORE DATABASE [cyrgweixin] 
                FROM DISK = '/Users/apple/Ahope/yykhotdog/database/zhkj2025-10-24.bak'
                WITH REPLACE
                """)
                conn.commit()
                print("✅ cyrgweixin数据库恢复成功")
                
            except Exception as e:
                print(f"❌ cyrgweixin数据库恢复失败: {e}")
                return False
            
            conn.close()
            return True
            
        except Exception as e:
            print(f"❌ 数据库恢复执行失败: {e}")
            return False
    
    def verify_restore_results(self):
        """验证恢复结果"""
        print("🔍 验证恢复结果...")
        
        try:
            conn = pymssql.connect(
                server='rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com',
                port=1433,
                user='hotdog',
                password='Zhkj@62102218',
                database='master'
            )
            cursor = conn.cursor()
            
            target_dbs = ['cyrg2025', 'cyrgweixin']
            success_count = 0
            
            for db_name in target_dbs:
                try:
                    cursor.execute(f'USE [{db_name}]')
                    
                    # 检查表数量
                    cursor.execute('SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = \'BASE TABLE\'')
                    table_count = cursor.fetchone()[0]
                    
                    # 检查数据量
                    cursor.execute('SELECT TOP 1 TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = \'BASE TABLE\'')
                    first_table = cursor.fetchone()
                    if first_table:
                        cursor.execute(f'SELECT COUNT(*) FROM [{first_table[0]}]')
                        record_count = cursor.fetchone()[0]
                        print(f"✅ {db_name}: {table_count} 个表, 示例表 {first_table[0]}: {record_count:,} 条记录")
                        
                        if record_count > 0:
                            success_count += 1
                        else:
                            print(f"⚠️ {db_name} 数据库仍然为空")
                    else:
                        print(f"❌ {db_name} 没有表")
                        
                except Exception as e:
                    print(f"❌ 检查 {db_name} 失败: {e}")
            
            conn.close()
            
            if success_count == len(target_dbs):
                print("🎉 所有数据库恢复成功！")
                return True
            else:
                print(f"⚠️ 部分数据库恢复失败 ({success_count}/{len(target_dbs)})")
                return False
                
        except Exception as e:
            print(f"❌ 验证恢复结果失败: {e}")
            return False

def main():
    """主函数"""
    print("🚀 执行数据库恢复")
    print("=" * 60)
    
    # 创建恢复实例
    restorer = ExecuteRestore()
    
    # 检查备份文件
    if not restorer.check_backup_files():
        print("❌ 备份文件检查失败")
        return False
    
    # 创建恢复脚本
    restorer.create_restore_sql_scripts()
    
    # 执行恢复
    if not restorer.execute_restore_via_sql():
        print("❌ 数据库恢复失败")
        return False
    
    # 验证结果
    if restorer.verify_restore_results():
        print("\n🎉 数据库恢复完成！")
        print("✅ cyrg2025数据库已恢复")
        print("✅ cyrgweixin数据库已恢复")
        return True
    else:
        print("\n⚠️ 数据库恢复可能不完整，请检查日志")
        return False

if __name__ == "__main__":
    main()
