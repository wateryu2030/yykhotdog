#!/usr/bin/env python3
"""
分析源数据库表结构
分析cyrg2025和cyrgweixin数据库的表结构，为hotdog2030数据库设计提供参考
"""

import pyodbc
import json
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

def analyze_database_tables(conn, database_name):
    """分析数据库表结构"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"USE [{database_name}]")
        
        # 获取所有表
        cursor.execute("""
            SELECT 
                TABLE_NAME,
                TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        """)
        tables = cursor.fetchall()
        
        print(f"\n📊 数据库 {database_name} 表结构分析:")
        print("=" * 60)
        
        table_info = {}
        
        for table_name, table_type in tables:
            print(f"\n🔍 分析表: {table_name}")
            
            # 获取表列信息
            cursor.execute(f"""
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    CHARACTER_MAXIMUM_LENGTH,
                    NUMERIC_PRECISION,
                    NUMERIC_SCALE,
                    IS_NULLABLE,
                    COLUMN_DEFAULT,
                    ORDINAL_POSITION
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '{table_name}'
                ORDER BY ORDINAL_POSITION
            """)
            
            columns = cursor.fetchall()
            
            # 获取表行数
            try:
                cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
                row_count = cursor.fetchone()[0]
            except:
                row_count = 0
            
            # 获取表大小
            try:
                cursor.execute(f"""
                    SELECT 
                        CAST(SUM(CAST(FILEPROPERTY(name, 'SpaceUsed') AS bigint) * 8.0 / 1024 AS decimal(15,2)) AS varchar) + ' KB' AS 'Table Size'
                    FROM sys.database_files
                    WHERE type = 0
                """)
                size_result = cursor.fetchone()
                table_size = size_result[0] if size_result else "未知"
            except:
                table_size = "未知"
            
            print(f"   行数: {row_count:,}")
            print(f"   大小: {table_size}")
            print(f"   列数: {len(columns)}")
            
            # 显示列信息
            print("   列信息:")
            for col in columns:
                col_name, data_type, char_length, num_precision, num_scale, is_nullable, col_default, ordinal_pos = col
                
                # 构建数据类型
                full_type = data_type
                if char_length and data_type in ['varchar', 'char', 'nvarchar', 'nchar']:
                    full_type += f"({char_length})"
                elif num_precision and data_type in ['decimal', 'numeric']:
                    if num_scale:
                        full_type += f"({num_precision},{num_scale})"
                    else:
                        full_type += f"({num_precision})"
                
                nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
                default = f" DEFAULT {col_default}" if col_default else ""
                
                print(f"     {ordinal_pos:2d}. {col_name:<30} {full_type:<20} {nullable}{default}")
            
            # 保存表信息
            table_info[table_name] = {
                'row_count': row_count,
                'table_size': table_size,
                'columns': [
                    {
                        'name': col[0],
                        'type': col[1],
                        'length': col[2],
                        'precision': col[3],
                        'scale': col[4],
                        'nullable': col[5] == 'YES',
                        'default': col[6],
                        'position': col[7]
                    } for col in columns
                ]
            }
        
        return table_info
        
    except Exception as e:
        print(f"❌ 分析数据库 {database_name} 失败: {e}")
        return {}

def analyze_relationships(conn, database_name):
    """分析表关系"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"USE [{database_name}]")
        
        # 获取外键关系
        cursor.execute("""
            SELECT 
                fk.name AS foreign_key_name,
                tp.name AS parent_table,
                cp.name AS parent_column,
                tr.name AS referenced_table,
                cr.name AS referenced_column
            FROM sys.foreign_keys fk
            INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
            INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
            INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
            INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
            INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
            ORDER BY tp.name, fk.name
        """)
        
        relationships = cursor.fetchall()
        
        if relationships:
            print(f"\n🔗 数据库 {database_name} 表关系:")
            print("-" * 40)
            for rel in relationships:
                fk_name, parent_table, parent_column, ref_table, ref_column = rel
                print(f"   {parent_table}.{parent_column} -> {ref_table}.{ref_column}")
        
        return relationships
        
    except Exception as e:
        print(f"❌ 分析表关系失败: {e}")
        return []

def main():
    """主函数"""
    print("🔍 源数据库表结构分析工具")
    print("=" * 60)
    
    # 连接数据库
    conn = get_connection()
    if not conn:
        return
    
    print("✅ 数据库连接成功")
    
    # 检查数据库是否存在
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sys.databases WHERE name IN ('cyrg2025', 'cyrgweixin', 'hotdog2030')")
    existing_dbs = [row[0] for row in cursor.fetchall()]
    
    print(f"\n📋 现有数据库: {', '.join(existing_dbs)}")
    
    # 分析cyrg2025数据库
    if 'cyrg2025' in existing_dbs:
        cyrg2025_info = analyze_database_tables(conn, 'cyrg2025')
        analyze_relationships(conn, 'cyrg2025')
    else:
        print("\n⚠️  cyrg2025数据库不存在，请先恢复数据库")
        cyrg2025_info = {}
    
    # 分析cyrgweixin数据库
    if 'cyrgweixin' in existing_dbs:
        cyrgweixin_info = analyze_database_tables(conn, 'cyrgweixin')
        analyze_relationships(conn, 'cyrgweixin')
    else:
        print("\n⚠️  cyrgweixin数据库不存在，请先恢复数据库")
        cyrgweixin_info = {}
    
    # 分析hotdog2030数据库
    if 'hotdog2030' in existing_dbs:
        hotdog2030_info = analyze_database_tables(conn, 'hotdog2030')
        analyze_relationships(conn, 'hotdog2030')
    else:
        print("\n⚠️  hotdog2030数据库不存在，请先创建数据库")
        hotdog2030_info = {}
    
    # 保存分析结果
    analysis_result = {
        'analysis_time': datetime.now().isoformat(),
        'cyrg2025': cyrg2025_info,
        'cyrgweixin': cyrgweixin_info,
        'hotdog2030': hotdog2030_info
    }
    
    with open('database_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(analysis_result, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 分析结果已保存到: database_analysis.json")
    
    # 关闭连接
    conn.close()
    
    print("\n🎉 数据库分析完成！")

if __name__ == "__main__":
    main()
