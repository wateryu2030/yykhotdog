#!/usr/bin/env python3
"""
复制数据库表结构和数据
从 cyrg202509 复制到 cyrg2025
"""

import pyodbc
import sys
from datetime import datetime

# 数据库连接配置
SERVER = "rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com,1433"
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

def get_table_list(conn, database_name):
    """获取数据库中的表列表"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"USE [{database_name}]")
        cursor.execute("""
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' 
            ORDER BY TABLE_NAME
        """)
        tables = [row[0] for row in cursor.fetchall()]
        return tables
    except Exception as e:
        print(f"❌ 获取表列表失败: {e}")
        return []

def copy_table_structure_and_data(conn, source_db, target_db, table_name):
    """复制表结构和数据"""
    try:
        cursor = conn.cursor()
        
        # 1. 获取表结构
        print(f"🔄 正在复制表 {table_name} 的结构...")
        cursor.execute(f"USE [{source_db}]")
        cursor.execute(f"""
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                NUMERIC_PRECISION,
                NUMERIC_SCALE,
                IS_NULLABLE,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '{table_name}'
            ORDER BY ORDINAL_POSITION
        """)
        
        columns = cursor.fetchall()
        if not columns:
            print(f"⚠️  表 {table_name} 没有列信息，跳过")
            return False
        
        # 2. 在目标数据库中创建表
        create_table_sql = f"CREATE TABLE [{target_db}].[dbo].[{table_name}] (\n"
        
        column_definitions = []
        for col in columns:
            col_name, data_type, char_length, num_precision, num_scale, is_nullable, col_default = col
            
            # 构建列定义
            col_def = f"    [{col_name}] {data_type}"
            
            # 添加长度或精度
            if char_length and data_type in ['varchar', 'char', 'nvarchar', 'nchar']:
                col_def += f"({char_length})"
            elif num_precision and data_type in ['decimal', 'numeric']:
                if num_scale:
                    col_def += f"({num_precision},{num_scale})"
                else:
                    col_def += f"({num_precision})"
            
            # 添加NULL约束
            if is_nullable == 'NO':
                col_def += " NOT NULL"
            
            # 添加默认值
            if col_default:
                col_def += f" DEFAULT {col_default}"
            
            column_definitions.append(col_def)
        
        create_table_sql += ",\n".join(column_definitions)
        create_table_sql += "\n)"
        
        # 在目标数据库中创建表
        cursor.execute(f"USE [{target_db}]")
        cursor.execute(create_table_sql)
        print(f"✅ 表 {table_name} 结构创建成功")
        
        # 3. 复制数据
        print(f"🔄 正在复制表 {table_name} 的数据...")
        cursor.execute(f"USE [{source_db}]")
        cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
        row_count = cursor.fetchone()[0]
        
        if row_count == 0:
            print(f"✅ 表 {table_name} 没有数据，跳过数据复制")
            return True
        
        print(f"📊 表 {table_name} 有 {row_count} 行数据")
        
        # 分批复制数据
        batch_size = 1000
        offset = 0
        
        while offset < row_count:
            cursor.execute(f"USE [{source_db}]")
            cursor.execute(f"SELECT * FROM [{table_name}] ORDER BY (SELECT NULL) OFFSET {offset} ROWS FETCH NEXT {batch_size} ROWS ONLY")
            
            rows = cursor.fetchall()
            if not rows:
                break
            
            # 插入数据到目标表
            cursor.execute(f"USE [{target_db}]")
            
            # 构建INSERT语句
            column_names = [col[0] for col in columns]
            placeholders = ", ".join(["?" for _ in column_names])
            insert_sql = f"INSERT INTO [{table_name}] ([{'], ['.join(column_names)}]) VALUES ({placeholders})"
            
            try:
                cursor.executemany(insert_sql, rows)
                print(f"✅ 已复制 {offset + len(rows)}/{row_count} 行数据")
            except Exception as e:
                print(f"⚠️  复制数据时出错: {e}")
                # 尝试逐行插入
                for row in rows:
                    try:
                        cursor.execute(insert_sql, row)
                    except Exception as row_error:
                        print(f"⚠️  跳过有问题的行: {row_error}")
            
            offset += batch_size
        
        print(f"✅ 表 {table_name} 数据复制完成")
        return True
        
    except Exception as e:
        print(f"❌ 复制表 {table_name} 失败: {e}")
        return False

def main():
    """主函数"""
    print("=" * 80)
    print("数据库表复制脚本 - 从 cyrg202509 复制到 cyrg2025")
    print("=" * 80)
    
    # 连接数据库
    print("\n1. 连接数据库...")
    conn = get_connection()
    if not conn:
        return False
    print("✅ 数据库连接成功")
    
    # 获取源数据库表列表
    print("\n2. 获取源数据库表列表...")
    source_tables = get_table_list(conn, "cyrg202509")
    if not source_tables:
        print("❌ 无法获取源数据库表列表")
        return False
    
    print(f"✅ 找到 {len(source_tables)} 个表")
    
    # 复制每个表
    print("\n3. 开始复制表...")
    success_count = 0
    failed_tables = []
    
    for i, table_name in enumerate(source_tables, 1):
        print(f"\n--- 处理表 {i}/{len(source_tables)}: {table_name} ---")
        
        if copy_table_structure_and_data(conn, "cyrg202509", "cyrg2025", table_name):
            success_count += 1
        else:
            failed_tables.append(table_name)
    
    # 关闭连接
    conn.close()
    
    # 输出结果
    print("\n" + "=" * 80)
    print("复制操作完成！")
    print(f"✅ 成功复制: {success_count} 个表")
    print(f"❌ 失败: {len(failed_tables)} 个表")
    
    if failed_tables:
        print("\n失败的表:")
        for table in failed_tables:
            print(f"  - {table}")
    
    print("=" * 80)
    
    return len(failed_tables) == 0

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
