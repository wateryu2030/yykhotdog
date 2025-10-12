#!/usr/bin/env python3
"""
检查数据迁移状态
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

def check_table_data(conn, table_name):
    """检查表数据量"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
        count = cursor.fetchone()[0]
        return count
    except Exception as e:
        return f"错误: {e}"

def main():
    """主函数"""
    print("=" * 60)
    print("📊 数据迁移状态检查")
    print("=" * 60)
    
    # 连接数据库
    conn = get_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        cursor.execute("USE [hotdog2030]")
        
        print("\n📋 hotdog2030数据库表数据统计:")
        print("-" * 50)
        
        # 检查各个表的数据量
        tables_to_check = [
            "customer_profiles",
            "customer_behavior_analysis", 
            "customer_product_preferences",
            "customer_time_analysis",
            "stores",
            "sales_predictions",
            "categories",
            "products",
            "orders",
            "order_items",
            "school_basic_info",
            "school_ai_analysis",
            "user_selected_schools",
            "school_region_mapping",
            "poi_data"
        ]
        
        total_records = 0
        for table in tables_to_check:
            count = check_table_data(conn, table)
            if isinstance(count, int):
                print(f"  {table}: {count:,} 条记录")
                total_records += count
            else:
                print(f"  {table}: {count}")
        
        print(f"\n📊 总计: {total_records:,} 条记录")
        
        # 检查源数据库的关键表
        print(f"\n📋 源数据库关键表数据量:")
        print("-" * 40)
        
        # cyrg2025数据库
        try:
            cursor.execute("USE [cyrg2025]")
            cursor.execute("SELECT COUNT(*) FROM Orders")
            cyrg_orders = cursor.fetchone()[0]
            print(f"  cyrg2025.Orders: {cyrg_orders:,} 条记录")
        except:
            print(f"  cyrg2025.Orders: 无法访问")
        
        # cyrgweixin数据库
        try:
            cursor.execute("USE [cyrgweixin]")
            cursor.execute("SELECT COUNT(*) FROM Orders")
            weixin_orders = cursor.fetchone()[0]
            print(f"  cyrgweixin.Orders: {weixin_orders:,} 条记录")
        except:
            print(f"  cyrgweixin.Orders: 无法访问")
        
        # 检查数据库文件大小变化
        print(f"\n📁 数据库文件大小:")
        print("-" * 30)
        cursor.execute("""
            SELECT 
                DB_NAME(database_id) as database_name,
                CAST(size * 8.0 / 1024 AS DECIMAL(10,2)) as size_mb
            FROM sys.master_files 
            WHERE DB_NAME(database_id) IN ('cyrg2025', 'cyrgweixin', 'hotdog2030')
            AND file_id = 1
            ORDER BY database_name
        """)
        
        files = cursor.fetchall()
        for file_info in files:
            db_name, size_mb = file_info
            print(f"  {db_name}: {size_mb:.1f} MB")
        
    except Exception as e:
        print(f"❌ 检查过程中发生错误: {e}")
    
    finally:
        conn.close()
    
    print("\n" + "=" * 60)
    print("✅ 数据迁移状态检查完成")
    print("=" * 60)

if __name__ == "__main__":
    main()
