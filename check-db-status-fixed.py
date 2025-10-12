#!/usr/bin/env python3
"""
修复的数据库状态检查脚本
"""

import pyodbc
from datetime import datetime

# 本地SQL Server连接配置
SERVER = "localhost,1433"
USERNAME = "sa"
PASSWORD = "YourStrong@Passw0rd"
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

def check_database_status():
    """检查数据库状态"""
    conn = get_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # 检查数据库状态
        cursor.execute("""
            SELECT 
                name,
                state_desc,
                is_in_standby,
                is_cleanly_shutdown
            FROM sys.databases 
            WHERE name IN ('cyrg2025', 'cyrgweixin', 'hotdog2030')
            ORDER BY name
        """)
        
        databases = cursor.fetchall()
        
        print(f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - 数据库状态:")
        print("-" * 60)
        
        all_online = True
        for db in databases:
            name, state, standby, clean = db
            status_icon = "✅" if state == "ONLINE" else "🔄" if state == "RESTORING" else "❌"
            print(f"{status_icon} {name}: {state}")
            if state != "ONLINE":
                all_online = False
        
        # 检查恢复进度（修复算术溢出问题）
        try:
            cursor.execute("""
                SELECT 
                    session_id,
                    command,
                    percent_complete,
                    start_time
                FROM sys.dm_exec_requests 
                WHERE command LIKE '%RESTORE%'
            """)
            
            restore_requests = cursor.fetchall()
            
            if restore_requests:
                print(f"\n📊 恢复进度:")
                print("-" * 40)
                for req in restore_requests:
                    session_id, command, percent, start_time = req
                    print(f"会话 {session_id}: {command}")
                    if percent is not None:
                        print(f"  进度: {percent:.1f}%")
                    print(f"  开始时间: {start_time}")
            else:
                print(f"\n📊 当前没有正在进行的恢复操作")
                
        except Exception as e:
            print(f"\n⚠️  无法获取恢复进度: {e}")
        
        # 检查数据库文件大小（修复算术溢出问题）
        try:
            cursor.execute("""
                SELECT 
                    DB_NAME(database_id) as database_name,
                    name as logical_name,
                    CAST(size * 8.0 / 1024 AS DECIMAL(10,2)) as size_mb
                FROM sys.master_files 
                WHERE DB_NAME(database_id) IN ('cyrg2025', 'cyrgweixin', 'hotdog2030')
                ORDER BY database_name, file_id
            """)
            
            files = cursor.fetchall()
            
            if files:
                print(f"\n📁 数据库文件信息:")
                print("-" * 50)
                current_db = None
                for file_info in files:
                    db_name, logical_name, size_mb = file_info
                    if db_name != current_db:
                        print(f"\n{db_name}:")
                        current_db = db_name
                    print(f"  {logical_name}: {size_mb:.1f} MB")
                    
        except Exception as e:
            print(f"\n⚠️  无法获取文件信息: {e}")
        
        # 尝试访问数据库
        print(f"\n🔍 数据库访问测试:")
        print("-" * 30)
        
        for db_name in ['cyrg2025', 'cyrgweixin', 'hotdog2030']:
            try:
                cursor.execute(f"USE [{db_name}]")
                cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
                table_count = cursor.fetchone()[0]
                print(f"✅ {db_name}: 可访问，包含 {table_count} 个表")
            except Exception as e:
                print(f"❌ {db_name}: 不可访问 - {str(e)[:100]}...")
        
        conn.close()
        return all_online
        
    except Exception as e:
        print(f"❌ 检查数据库状态失败: {e}")
        return False

def main():
    """主函数"""
    print("🔍 数据库状态检查（修复版）")
    print("=" * 60)
    
    if check_database_status():
        print("\n🎉 所有数据库都已在线！")
        print("\n下一步:")
        print("1. 运行 'python3 migrate-data-to-hotdog2030.py' 开始数据迁移")
        print("2. 运行 'node test-local-db.js' 测试连接")
    else:
        print("\n⏳ 数据库仍在恢复中，请稍等...")
        print("\n数据库文件位置:")
        print("- 存储在Docker容器内部: /var/opt/mssql/data/")
        print("- 本地database目录只包含备份文件(.bak)")

if __name__ == "__main__":
    main()
