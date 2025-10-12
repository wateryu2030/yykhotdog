#!/usr/bin/env python3
"""
从备份文件正确恢复数据库
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

def restore_database_from_backup(conn, database_name, backup_file):
    """从备份文件恢复数据库"""
    try:
        cursor = conn.cursor()
        
        print(f"🔄 正在从备份文件恢复数据库 {database_name}...")
        print(f"   备份文件: {backup_file}")
        
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
            print(f"   ✅ 成功删除现有数据库 {database_name}")
        except Exception as e:
            print(f"   ⚠️  删除数据库时出现警告: {e}")
        
        # 2. 获取备份文件信息
        print(f"   获取备份文件信息...")
        backup_info_sql = f"RESTORE FILELISTONLY FROM DISK = '{backup_file}'"
        cursor.execute(backup_info_sql)
        backup_info = cursor.fetchall()
        
        if not backup_info:
            print(f"   ❌ 无法读取备份文件信息: {backup_file}")
            return False
        
        print(f"   📋 备份文件包含 {len(backup_info)} 个文件:")
        for i, file_info in enumerate(backup_info):
            logical_name, physical_name, file_type, file_size = file_info[:4]
            file_type_desc = "数据文件" if file_type == "D" else "日志文件"
            print(f"     {i+1}. {logical_name} ({file_type_desc}) - {physical_name}")
        
        # 3. 构建恢复SQL
        move_clauses = []
        for file_info in backup_info:
            logical_name, physical_name, file_type, file_size = file_info[:4]
            if file_type == "D":  # 数据文件
                new_physical = f"/var/opt/mssql/data/{database_name}.mdf"
            else:  # 日志文件
                new_physical = f"/var/opt/mssql/data/{database_name}_log.ldf"
            
            move_clauses.append(f"MOVE '{logical_name}' TO '{new_physical}'")
        
        restore_sql = f"""
        RESTORE DATABASE [{database_name}] 
        FROM DISK = '{backup_file}' 
        WITH REPLACE,
        {', '.join(move_clauses)}
        """
        
        print(f"   🔄 执行恢复操作...")
        print(f"   SQL: {restore_sql}")
        cursor.execute(restore_sql)
        print(f"   ✅ 成功恢复数据库 {database_name}")
        
        # 4. 验证恢复结果
        print(f"   验证恢复结果...")
        cursor.execute(f"USE [{database_name}]")
        cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
        table_count = cursor.fetchone()[0]
        print(f"   📊 数据库 {database_name} 包含 {table_count} 个表")
        
        # 5. 显示表列表
        cursor.execute("""
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' 
            ORDER BY TABLE_NAME
        """)
        tables = cursor.fetchall()
        print(f"   📋 表列表:")
        for table in tables:
            print(f"     - {table[0]}")
        
        return True
        
    except Exception as e:
        print(f"❌ 恢复数据库 {database_name} 失败: {e}")
        return False

def main():
    """主函数"""
    print("=" * 60)
    print("🚀 从备份文件正确恢复数据库")
    print("=" * 60)
    
    # 连接数据库
    print("\n1️⃣ 连接本地SQL Server...")
    conn = get_connection()
    if not conn:
        return False
    print("✅ 数据库连接成功")
    
    # 恢复cyrg2025数据库
    print("\n2️⃣ 恢复cyrg2025数据库...")
    success1 = restore_database_from_backup(conn, "cyrg2025", "/backup/cyrg_backup_2025_09_09_000004_9004235.bak")
    
    # 恢复cyrgweixin数据库
    print("\n3️⃣ 恢复cyrgweixin数据库...")
    success2 = restore_database_from_backup(conn, "cyrgweixin", "/backup/zhkj_backup_2025_09_09_000002_6761311.bak")
    
    # 创建hotdog2030数据库
    print("\n4️⃣ 创建hotdog2030数据库...")
    try:
        cursor = conn.cursor()
        cursor.execute("CREATE DATABASE [hotdog2030]")
        print("✅ 创建hotdog2030数据库成功")
        success3 = True
    except Exception as e:
        print(f"❌ 创建hotdog2030数据库失败: {e}")
        success3 = False
    
    # 验证所有数据库
    print("\n5️⃣ 验证所有数据库...")
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
        
        # 检查每个数据库的表数量
        print(f"\n📊 数据库表统计:")
        print("-" * 30)
        for db_name in ['cyrg2025', 'cyrgweixin', 'hotdog2030']:
            try:
                cursor.execute(f"USE [{db_name}]")
                cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
                table_count = cursor.fetchone()[0]
                print(f"  {db_name}: {table_count} 个表")
                
                # 如果是恢复的数据库，显示前几个表名
                if db_name in ['cyrg2025', 'cyrgweixin'] and table_count > 0:
                    cursor.execute("""
                        SELECT TOP 5 TABLE_NAME 
                        FROM INFORMATION_SCHEMA.TABLES 
                        WHERE TABLE_TYPE = 'BASE TABLE' 
                        ORDER BY TABLE_NAME
                    """)
                    tables = cursor.fetchall()
                    print(f"    前5个表: {', '.join([t[0] for t in tables])}")
                    
            except Exception as e:
                print(f"  {db_name}: 无法访问 - {e}")
        
    except Exception as e:
        print(f"❌ 验证数据库时发生错误: {e}")
    
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
        print("🎉 数据库恢复完成！")
        print("\n下一步:")
        print("1. 运行 'python3 migrate-data-to-hotdog2030.py' 开始数据迁移")
        print("2. 运行 'node test-local-db.js' 测试连接")
    else:
        print("⚠️  部分数据库恢复失败，请检查错误信息")
    
    return success1 and success2 and success3

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
