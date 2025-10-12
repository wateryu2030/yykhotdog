#!/usr/bin/env python3
"""
简单数据库恢复脚本
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

def drop_and_recreate_database(conn, database_name):
    """删除并重新创建数据库"""
    try:
        cursor = conn.cursor()
        
        print(f"🔄 处理数据库 {database_name}...")
        
        # 删除现有数据库
        try:
            cursor.execute(f"""
                IF EXISTS (SELECT name FROM sys.databases WHERE name = '{database_name}')
                BEGIN
                    ALTER DATABASE [{database_name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE
                    DROP DATABASE [{database_name}]
                END
            """)
            print(f"  ✅ 删除现有数据库 {database_name}")
        except Exception as e:
            print(f"  ⚠️  删除数据库时出现警告: {e}")
        
        # 创建新数据库
        cursor.execute(f"CREATE DATABASE [{database_name}]")
        print(f"  ✅ 创建新数据库 {database_name}")
        
        return True
        
    except Exception as e:
        print(f"❌ 处理数据库 {database_name} 失败: {e}")
        return False

def main():
    """主函数"""
    print("=" * 60)
    print("🚀 简单数据库恢复脚本")
    print("=" * 60)
    
    # 连接数据库
    print("\n1️⃣ 连接本地SQL Server...")
    conn = get_connection()
    if not conn:
        return False
    print("✅ 数据库连接成功")
    
    # 处理cyrg2025数据库
    print("\n2️⃣ 处理cyrg2025数据库...")
    success1 = drop_and_recreate_database(conn, "cyrg2025")
    
    # 处理cyrgweixin数据库
    print("\n3️⃣ 处理cyrgweixin数据库...")
    success2 = drop_and_recreate_database(conn, "cyrgweixin")
    
    # 验证数据库
    print("\n4️⃣ 验证数据库...")
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                name as '数据库名称',
                state_desc as '状态',
                create_date as '创建日期'
            FROM sys.databases 
            WHERE name IN ('cyrg2025', 'cyrgweixin', 'hotdog2030')
            ORDER BY name
        """)
        
        databases = cursor.fetchall()
        print("\n📋 数据库列表:")
        print("-" * 50)
        for db in databases:
            print(f"✅ {db[0]} - {db[1]} (创建时间: {db[2]})")
        
    except Exception as e:
        print(f"❌ 验证数据库时发生错误: {e}")
    
    # 关闭连接
    conn.close()
    
    # 输出结果
    print("\n" + "=" * 60)
    print("📊 处理结果:")
    print(f"cyrg2025: {'✅ 成功' if success1 else '❌ 失败'}")
    print(f"cyrgweixin: {'✅ 成功' if success2 else '❌ 失败'}")
    print("=" * 60)
    
    if success1 and success2:
        print("🎉 数据库处理完成！")
        print("\n注意:")
        print("- 数据库已创建但为空数据库")
        print("- 需要从备份文件重新恢复数据")
        print("- 或者使用现有的数据迁移脚本")
    else:
        print("⚠️  部分数据库处理失败，请检查错误信息")
    
    return success1 and success2

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
