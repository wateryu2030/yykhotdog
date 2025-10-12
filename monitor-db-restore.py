#!/usr/bin/env python3
"""
监控数据库恢复进度
"""

import pyodbc
import time
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

def check_restore_progress():
    """检查恢复进度"""
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
        
        print(f"\n🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - 数据库状态:")
        print("-" * 60)
        
        all_online = True
        for db in databases:
            name, state, standby, clean = db
            status_icon = "✅" if state == "ONLINE" else "🔄" if state == "RESTORING" else "❌"
            print(f"{status_icon} {name}: {state}")
            if state != "ONLINE":
                all_online = False
        
        # 检查恢复进度
        cursor.execute("""
            SELECT 
                session_id,
                command,
                percent_complete,
                estimated_completion_time,
                start_time
            FROM sys.dm_exec_requests 
            WHERE command LIKE '%RESTORE%'
        """)
        
        restore_requests = cursor.fetchall()
        
        if restore_requests:
            print(f"\n📊 恢复进度:")
            print("-" * 40)
            for req in restore_requests:
                session_id, command, percent, completion_time, start_time = req
                print(f"会话 {session_id}: {command}")
                if percent is not None:
                    print(f"  进度: {percent:.1f}%")
                if completion_time:
                    print(f"  预计完成时间: {completion_time}")
                print(f"  开始时间: {start_time}")
        
        # 检查数据库文件大小
        cursor.execute("""
            SELECT 
                DB_NAME(database_id) as database_name,
                name as logical_name,
                physical_name,
                size * 8 / 1024 as size_mb,
                max_size * 8 / 1024 as max_size_mb
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
                db_name, logical_name, physical_name, size_mb, max_size_mb = file_info
                if db_name != current_db:
                    print(f"\n{db_name}:")
                    current_db = db_name
                print(f"  {logical_name}: {size_mb:.1f} MB ({physical_name})")
        
        conn.close()
        return all_online
        
    except Exception as e:
        print(f"❌ 检查恢复进度失败: {e}")
        return False

def main():
    """主函数"""
    print("🔍 数据库恢复进度监控")
    print("=" * 60)
    print("数据库文件位置说明:")
    print("- 数据库文件存储在Docker容器内部: /var/opt/mssql/data/")
    print("- 本地database目录只包含备份文件(.bak)")
    print("- 要查看数据库文件，需要进入容器内部")
    print("=" * 60)
    
    print("\n开始监控恢复进度...")
    print("按 Ctrl+C 停止监控")
    
    try:
        while True:
            if check_restore_progress():
                print("\n🎉 所有数据库恢复完成！")
                break
            
            print(f"\n⏳ 等待30秒后再次检查...")
            time.sleep(30)
            
    except KeyboardInterrupt:
        print("\n\n⏹️  监控已停止")
    except Exception as e:
        print(f"\n❌ 监控过程中发生错误: {e}")

if __name__ == "__main__":
    main()
