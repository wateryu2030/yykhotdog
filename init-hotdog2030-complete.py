#!/usr/bin/env python3
"""
执行hotdog2030数据库完整初始化
"""

import pyodbc
import os

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

def execute_sql_file(conn, sql_file_path):
    """执行SQL文件"""
    try:
        with open(sql_file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # 分割SQL语句（以GO为分隔符）
        sql_statements = [stmt.strip() for stmt in sql_content.split('GO') if stmt.strip()]
        
        cursor = conn.cursor()
        
        for i, sql_stmt in enumerate(sql_statements, 1):
            if sql_stmt.strip():
                try:
                    print(f"🔄 执行SQL语句 {i}/{len(sql_statements)}...")
                    cursor.execute(sql_stmt)
                    print(f"✅ SQL语句 {i} 执行成功")
                except Exception as e:
                    print(f"⚠️  SQL语句 {i} 执行失败: {e}")
                    # 继续执行其他语句
                    continue
        
        print("✅ SQL文件执行完成")
        return True
        
    except Exception as e:
        print(f"❌ 执行SQL文件失败: {e}")
        return False

def verify_tables(conn):
    """验证表是否创建成功"""
    try:
        cursor = conn.cursor()
        cursor.execute("USE [hotdog2030]")
        cursor.execute("""
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        
        print(f"\n📋 hotdog2030数据库表列表 ({len(tables)} 个表):")
        print("-" * 50)
        
        # 按类别分组显示
        categories = {
            '客户相关': ['customer_profiles', 'customer_behavior_analysis', 'customer_product_preferences', 'customer_time_analysis'],
            '门店相关': ['stores', 'sales_predictions', 'store_factor_weights'],
            '商品相关': ['categories', 'products'],
            '订单相关': ['orders', 'order_items'],
            '学校相关': ['school_basic_info', 'school_ai_analysis', 'user_selected_schools', 'school_region_mapping'],
            '其他': ['poi_data']
        }
        
        for category, expected_tables in categories.items():
            print(f"\n{category}:")
            for table in expected_tables:
                if table in tables:
                    print(f"  ✅ {table}")
                else:
                    print(f"  ❌ {table} (缺失)")
        
        # 显示其他表
        other_tables = [t for t in tables if not any(t in cat for cat in categories.values())]
        if other_tables:
            print(f"\n其他表:")
            for table in other_tables:
                print(f"  ✅ {table}")
        
        return len(tables) > 0
        
    except Exception as e:
        print(f"❌ 验证表结构失败: {e}")
        return False

def main():
    """主函数"""
    print("=" * 60)
    print("🚀 hotdog2030数据库完整初始化")
    print("=" * 60)
    
    # 连接数据库
    print("\n1️⃣ 连接本地SQL Server...")
    conn = get_connection()
    if not conn:
        return False
    print("✅ 数据库连接成功")
    
    # 执行SQL文件
    print("\n2️⃣ 执行初始化SQL...")
    sql_file = "init-hotdog2030-complete.sql"
    if not os.path.exists(sql_file):
        print(f"❌ SQL文件不存在: {sql_file}")
        return False
    
    if not execute_sql_file(conn, sql_file):
        print("❌ SQL执行失败")
        return False
    
    # 验证表结构
    print("\n3️⃣ 验证表结构...")
    if not verify_tables(conn):
        print("❌ 表结构验证失败")
        return False
    
    # 关闭连接
    conn.close()
    
    print("\n" + "=" * 60)
    print("🎉 hotdog2030数据库初始化完成！")
    print("=" * 60)
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
