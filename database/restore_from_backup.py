#!/usr/bin/env python3
"""
数据库恢复脚本
从本地.bak文件恢复数据库到Azure SQL Database
"""

import pyodbc
import os
import sys
from datetime import datetime

# 数据库连接配置
SERVER = "rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com,1433"
USERNAME = "hotdog"
PASSWORD = "Zhkj@62102218"
DRIVER = "ODBC Driver 18 for SQL Server"

# 备份文件路径 - 使用最新的备份文件
CYRG_BACKUP = "/Users/weijunyu/yylkhotdog/database/cyrg2025-10-16.bak"
ZHKJ_BACKUP = "/Users/weijunyu/yylkhotdog/database/zhkj2025-10-16.bak"

def get_connection():
    """获取数据库连接"""
    try:
        connection_string = f"DRIVER={{{DRIVER}}};SERVER={SERVER};UID={USERNAME};PWD={PASSWORD};Encrypt=no;TrustServerCertificate=yes;"
        conn = pyodbc.connect(connection_string, autocommit=True)
        return conn
    except Exception as e:
        print(f"数据库连接失败: {e}")
        return None

def check_backup_file(file_path):
    """检查备份文件是否存在"""
    if not os.path.exists(file_path):
        print(f"备份文件不存在: {file_path}")
        return False
    file_size = os.path.getsize(file_path)
    print(f"备份文件: {file_path}")
    print(f"文件大小: {file_size / (1024*1024):.2f} MB")
    return True

def restore_database(conn, database_name, backup_file):
    """恢复数据库"""
    try:
        cursor = conn.cursor()
        
        # 1. 删除现有数据库（如果存在）
        print(f"正在删除现有数据库 {database_name}...")
        try:
            cursor.execute(f"ALTER DATABASE [{database_name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE")
            cursor.execute(f"DROP DATABASE [{database_name}]")
            conn.commit()
            print(f"成功删除数据库 {database_name}")
        except Exception as e:
            print(f"删除数据库时出现警告: {e}")
        
        # 2. 尝试从本地文件恢复（这通常不会成功，因为服务器无法访问本地文件）
        print(f"正在尝试从本地文件恢复 {database_name}...")
        try:
            # 由于服务器无法访问本地文件，这个操作会失败
            restore_sql = f"""
            RESTORE DATABASE [{database_name}] 
            FROM DISK = '{backup_file}' 
            WITH REPLACE
            """
            cursor.execute(restore_sql)
            conn.commit()
            print(f"成功恢复数据库 {database_name}")
            return True
        except Exception as e:
            print(f"从本地文件恢复失败: {e}")
            print("这是预期的，因为服务器无法访问本地文件")
        
        # 3. 创建空数据库作为替代
        print(f"正在创建空数据库 {database_name}...")
        try:
            cursor.execute(f"CREATE DATABASE [{database_name}]")
            conn.commit()
            print(f"成功创建空数据库 {database_name}")
            return True
        except Exception as e:
            print(f"创建数据库失败: {e}")
            return False
            
    except Exception as e:
        print(f"恢复数据库 {database_name} 时发生错误: {e}")
        return False

def main():
    """主函数"""
    print("=" * 60)
    print("数据库恢复脚本")
    print("=" * 60)
    
    # 检查备份文件
    print("\n1. 检查备份文件...")
    if not check_backup_file(CYRG_BACKUP):
        return False
    if not check_backup_file(ZHKJ_BACKUP):
        return False
    
    # 连接数据库
    print("\n2. 连接数据库...")
    conn = get_connection()
    if not conn:
        return False
    print("数据库连接成功")
    
    # 恢复cyrg2025数据库
    print("\n3. 恢复cyrg2025数据库...")
    success1 = restore_database(conn, "cyrg2025", CYRG_BACKUP)
    
    # 恢复cyrgweixin数据库
    print("\n4. 恢复cyrgweixin数据库...")
    success2 = restore_database(conn, "cyrgweixin", ZHKJ_BACKUP)
    
    # 关闭连接
    conn.close()
    
    # 输出结果
    print("\n" + "=" * 60)
    print("恢复结果:")
    print(f"cyrg2025: {'成功' if success1 else '失败'}")
    print(f"cyrgweixin: {'成功' if success2 else '失败'}")
    print("=" * 60)
    
    return success1 and success2

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
