#!/usr/bin/env python3
"""
数据库覆盖脚本
用 cyrg202509 数据库覆盖 cyrg2025 数据库
"""

import pyodbc
import os
import sys
from datetime import datetime

# 数据库连接配置
SERVER = "rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com,1433"
USERNAME = "hotdog"
PASSWORD = "Zhkj@62102218"
DRIVER = "ODBC Driver 18 for SQL Server"

def get_connection():
    """获取数据库连接"""
    try:
        connection_string = f"DRIVER={{{DRIVER}}};SERVER={SERVER};UID={USERNAME};PWD={PASSWORD};Encrypt=no;TrustServerCertificate=yes;"
        conn = pyodbc.connect(connection_string, autocommit=True)
        return conn
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return None

def check_database_exists(conn, database_name):
    """检查数据库是否存在"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT name FROM sys.databases WHERE name = '{database_name}'")
        result = cursor.fetchone()
        return result is not None
    except Exception as e:
        print(f"❌ 检查数据库 {database_name} 时出错: {e}")
        return False

def get_database_info(conn, database_name):
    """获取数据库信息"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"USE [{database_name}]")
        
        # 获取表数量
        cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
        table_count = cursor.fetchone()[0]
        
        # 获取列数量
        cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS")
        column_count = cursor.fetchone()[0]
        
        # 获取数据库大小
        cursor.execute(f"""
            SELECT 
                CAST(SUM(CAST(FILEPROPERTY(name, 'SpaceUsed') AS bigint) * 8.0 / 1024 / 1024 AS decimal(15,2)) AS varchar) + ' MB' AS 'Database Size'
            FROM sys.database_files
            WHERE type = 0
        """)
        size_result = cursor.fetchone()
        db_size = size_result[0] if size_result else "未知"
        
        return table_count, column_count, db_size
    except Exception as e:
        print(f"❌ 获取数据库 {database_name} 信息时出错: {e}")
        return 0, 0, "未知"

def backup_database(conn, database_name):
    """备份数据库（可选）"""
    try:
        backup_name = f"{database_name}_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        backup_path = f"/tmp/{backup_name}.bak"
        
        cursor = conn.cursor()
        backup_sql = f"""
        BACKUP DATABASE [{database_name}] 
        TO DISK = '{backup_path}'
        WITH FORMAT, INIT, NAME = '{backup_name}'
        """
        
        print(f"🔄 正在备份数据库 {database_name}...")
        cursor.execute(backup_sql)
        print(f"✅ 数据库 {database_name} 备份完成: {backup_path}")
        return True
    except Exception as e:
        print(f"⚠️  备份数据库 {database_name} 失败: {e}")
        return False

def drop_database(conn, database_name):
    """删除数据库"""
    try:
        cursor = conn.cursor()
        
        # 设置数据库为单用户模式并断开所有连接
        print(f"🔄 正在断开 {database_name} 数据库的所有连接...")
        cursor.execute(f"ALTER DATABASE [{database_name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE")
        
        # 删除数据库
        print(f"🔄 正在删除数据库 {database_name}...")
        cursor.execute(f"DROP DATABASE [{database_name}]")
        
        print(f"✅ 数据库 {database_name} 删除成功")
        return True
    except Exception as e:
        print(f"❌ 删除数据库 {database_name} 失败: {e}")
        return False

def rename_database(conn, old_name, new_name):
    """重命名数据库"""
    try:
        cursor = conn.cursor()
        
        # 使用 ALTER DATABASE 重命名数据库
        print(f"🔄 正在将数据库 {old_name} 重命名为 {new_name}...")
        cursor.execute(f"ALTER DATABASE [{old_name}] MODIFY NAME = [{new_name}]")
        
        print(f"✅ 数据库重命名成功: {old_name} -> {new_name}")
        return True
    except Exception as e:
        print(f"❌ 重命名数据库失败: {e}")
        return False

def verify_database_restore(conn, database_name):
    """验证数据库恢复结果"""
    try:
        cursor = conn.cursor()
        
        # 检查数据库是否存在
        if not check_database_exists(conn, database_name):
            print(f"❌ 数据库 {database_name} 不存在")
            return False
        
        # 获取数据库信息
        table_count, column_count, db_size = get_database_info(conn, database_name)
        
        print(f"✅ 数据库 {database_name} 验证成功:")
        print(f"   - 表数量: {table_count}")
        print(f"   - 列数量: {column_count}")
        print(f"   - 数据库大小: {db_size}")
        
        return True
    except Exception as e:
        print(f"❌ 验证数据库 {database_name} 失败: {e}")
        return False

def main():
    """主函数"""
    print("=" * 80)
    print("数据库覆盖脚本 - 用 cyrg202509 覆盖 cyrg2025")
    print("=" * 80)
    
    # 连接数据库
    print("\n1. 连接数据库...")
    conn = get_connection()
    if not conn:
        return False
    print("✅ 数据库连接成功")
    
    # 检查源数据库 cyrg202509 是否存在
    print("\n2. 检查源数据库 cyrg202509...")
    if not check_database_exists(conn, "cyrg202509"):
        print("❌ 源数据库 cyrg202509 不存在，无法执行覆盖操作")
        return False
    
    # 获取源数据库信息
    table_count, column_count, db_size = get_database_info(conn, "cyrg202509")
    print(f"✅ 源数据库 cyrg202509 信息:")
    print(f"   - 表数量: {table_count}")
    print(f"   - 列数量: {column_count}")
    print(f"   - 数据库大小: {db_size}")
    
    # 检查目标数据库 cyrg2025 是否存在
    print("\n3. 检查目标数据库 cyrg2025...")
    cyrg2025_exists = check_database_exists(conn, "cyrg2025")
    if cyrg2025_exists:
        print("⚠️  目标数据库 cyrg2025 已存在，将先删除")
        
        # 询问是否备份现有数据库
        backup_choice = input("是否备份现有的 cyrg2025 数据库？(y/N): ").strip().lower()
        if backup_choice in ['y', 'yes']:
            backup_database(conn, "cyrg2025")
        
        # 删除现有数据库
        if not drop_database(conn, "cyrg2025"):
            print("❌ 无法删除现有数据库，操作终止")
            return False
    else:
        print("✅ 目标数据库 cyrg2025 不存在，可以直接重命名")
    
    # 重命名数据库
    print("\n4. 重命名数据库...")
    if not rename_database(conn, "cyrg202509", "cyrg2025"):
        print("❌ 数据库重命名失败，操作终止")
        return False
    
    # 验证恢复结果
    print("\n5. 验证恢复结果...")
    if not verify_database_restore(conn, "cyrg2025"):
        print("❌ 数据库恢复验证失败")
        return False
    
    # 关闭连接
    conn.close()
    
    print("\n" + "=" * 80)
    print("🎉 数据库覆盖操作完成！")
    print("cyrg202509 已成功覆盖 cyrg2025")
    print("=" * 80)
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  操作被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 发生未预期的错误: {e}")
        sys.exit(1)
