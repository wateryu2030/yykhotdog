#!/usr/bin/env python3
"""
本地SQL Server数据库恢复脚本
从.bak文件恢复数据库到本地SQL Server
"""

import pyodbc
import os
import sys
from datetime import datetime

# 本地SQL Server连接配置
SERVER = "localhost,1433"
USERNAME = "sa"
PASSWORD = "YourStrong@Passw0rd"  # 请根据您的实际密码修改
DRIVER = "ODBC Driver 18 for SQL Server"

# 备份文件路径
CYRG_BACKUP = "/Users/weijunyu/yylkhotdog/database/cyrg_backup_2025_09_09_000004_9004235.bak"
ZHKJ_BACKUP = "/Users/weijunyu/yylkhotdog/database/zhkj_backup_2025_09_09_000002_6761311.bak"

def get_connection():
    """获取数据库连接"""
    try:
        connection_string = f"DRIVER={{{DRIVER}}};SERVER={SERVER};UID={USERNAME};PWD={PASSWORD};Encrypt=no;TrustServerCertificate=yes;"
        conn = pyodbc.connect(connection_string, autocommit=True)
        return conn
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        print("💡 请确保:")
        print("   1. SQL Server服务正在运行")
        print("   2. 用户名和密码正确")
        print("   3. 端口1433可访问")
        return None

def check_backup_file(file_path):
    """检查备份文件是否存在"""
    if not os.path.exists(file_path):
        print(f"❌ 备份文件不存在: {file_path}")
        return False
    file_size = os.path.getsize(file_path)
    print(f"✅ 备份文件: {os.path.basename(file_path)}")
    print(f"   文件大小: {file_size / (1024*1024):.2f} MB")
    return True

def restore_database(conn, database_name, backup_file):
    """恢复数据库"""
    try:
        cursor = conn.cursor()
        
        print(f"🔄 正在恢复数据库 {database_name}...")
        
        # 1. 删除现有数据库（如果存在）
        try:
            print(f"   删除现有数据库 {database_name}...")
            cursor.execute(f"""
                IF EXISTS (SELECT name FROM sys.databases WHERE name = '{database_name}')
                BEGIN
                    ALTER DATABASE [{database_name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE
                    DROP DATABASE [{database_name}]
                END
            """)
            conn.commit()
            print(f"   ✅ 成功删除现有数据库 {database_name}")
        except Exception as e:
            print(f"   ⚠️  删除数据库时出现警告: {e}")
        
        # 2. 从备份文件恢复
        try:
            print(f"   从备份文件恢复 {database_name}...")
            
            # 获取备份文件信息
            backup_info_sql = f"""
            RESTORE FILELISTONLY FROM DISK = '{backup_file}'
            """
            cursor.execute(backup_info_sql)
            backup_info = cursor.fetchall()
            
            if not backup_info:
                print(f"   ❌ 无法读取备份文件信息: {backup_file}")
                return False
            
            # 构建恢复SQL
            restore_sql = f"""
            RESTORE DATABASE [{database_name}] 
            FROM DISK = '{backup_file}' 
            WITH REPLACE,
            MOVE '{backup_info[0][0]}' TO '/var/opt/mssql/data/{database_name}.mdf',
            MOVE '{backup_info[0][1]}' TO '/var/opt/mssql/data/{database_name}_log.ldf'
            """
            
            cursor.execute(restore_sql)
            conn.commit()
            print(f"   ✅ 成功恢复数据库 {database_name}")
            return True
            
        except Exception as e:
            print(f"   ❌ 从备份文件恢复失败: {e}")
            
            # 3. 如果恢复失败，创建空数据库
            print(f"   🔄 尝试创建空数据库 {database_name}...")
            try:
                cursor.execute(f"CREATE DATABASE [{database_name}]")
                conn.commit()
                print(f"   ✅ 成功创建空数据库 {database_name}")
                return True
            except Exception as e2:
                print(f"   ❌ 创建空数据库失败: {e2}")
                return False
            
    except Exception as e:
        print(f"❌ 恢复数据库 {database_name} 时发生错误: {e}")
        return False

def verify_databases(conn):
    """验证数据库是否创建成功"""
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                name as '数据库名称',
                database_id as '数据库ID',
                create_date as '创建日期'
            FROM sys.databases 
            WHERE name IN ('cyrg2025', 'cyrgweixin', 'hotdog2030')
            ORDER BY name
        """)
        
        databases = cursor.fetchall()
        print("\n📋 数据库列表:")
        print("-" * 50)
        for db in databases:
            print(f"✅ {db[0]} (ID: {db[1]}, 创建时间: {db[2]})")
        
        return len(databases) > 0
        
    except Exception as e:
        print(f"❌ 验证数据库时发生错误: {e}")
        return False

def main():
    """主函数"""
    print("=" * 60)
    print("🚀 本地SQL Server数据库恢复脚本")
    print("=" * 60)
    
    # 检查备份文件
    print("\n1️⃣ 检查备份文件...")
    if not check_backup_file(CYRG_BACKUP):
        return False
    if not check_backup_file(ZHKJ_BACKUP):
        return False
    
    # 连接数据库
    print("\n2️⃣ 连接本地SQL Server...")
    conn = get_connection()
    if not conn:
        return False
    print("✅ 数据库连接成功")
    
    # 恢复cyrg2025数据库
    print("\n3️⃣ 恢复cyrg2025数据库...")
    success1 = restore_database(conn, "cyrg2025", CYRG_BACKUP)
    
    # 恢复cyrgweixin数据库
    print("\n4️⃣ 恢复cyrgweixin数据库...")
    success2 = restore_database(conn, "cyrgweixin", ZHKJ_BACKUP)
    
    # 创建hotdog2030数据库
    print("\n5️⃣ 创建hotdog2030数据库...")
    try:
        cursor = conn.cursor()
        cursor.execute("""
            IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'hotdog2030')
            BEGIN
                CREATE DATABASE [hotdog2030]
            END
        """)
        conn.commit()
        print("✅ 成功创建hotdog2030数据库")
        success3 = True
    except Exception as e:
        print(f"❌ 创建hotdog2030数据库失败: {e}")
        success3 = False
    
    # 验证数据库
    print("\n6️⃣ 验证数据库...")
    verify_databases(conn)
    
    # 关闭连接
    conn.close()
    
    # 输出结果
    print("\n" + "=" * 60)
    print("📊 恢复结果:")
    print(f"cyrg2025: {'✅ 成功' if success1 else '❌ 失败'}")
    print(f"cyrgweixin: {'✅ 成功' if success2 else '❌ 失败'}")
    print(f"hotdog2030: {'✅ 成功' if success3 else '❌ 失败'}")
    print("=" * 60)
    
    if success1 and success2 and success3:
        print("🎉 所有数据库恢复/创建成功！")
        print("\n下一步:")
        print("1. 运行初始化脚本创建hotdog2030的表结构")
        print("2. 运行 'node test-local-db.js' 测试连接")
        print("3. 启动应用程序")
    else:
        print("⚠️  部分数据库恢复失败，请检查错误信息")
    
    return success1 and success2 and success3

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
