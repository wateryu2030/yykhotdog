#!/usr/bin/env python3
"""
检查本地数据库中表的结构
"""

import pyodbc

# 本地数据库配置
LOCAL_CONFIG = {
    'server': 'localhost',
    'port': 1433,
    'database': 'hotdog2030',
    'username': 'sa',
    'password': 'YourStrong@Passw0rd',
    'driver': '{ODBC Driver 18 for SQL Server}',
    'timeout': 30
}

def get_connection_string(config):
    """构建连接字符串"""
    return (
        f"DRIVER={config['driver']};"
        f"SERVER={config['server']},{config['port']};"
        f"DATABASE={config['database']};"
        f"UID={config['username']};"
        f"PWD={config['password']};"
        f"TrustServerCertificate=yes;"
        f"Connection Timeout={config['timeout']};"
    )

def check_table_structure(table_name):
    """检查表结构"""
    print(f"\n🔍 检查本地表 {table_name} 的结构:")
    
    try:
        conn_str = get_connection_string(LOCAL_CONFIG)
        
        with pyodbc.connect(conn_str) as conn:
            cursor = conn.cursor()
            
            # 检查表是否存在
            cursor.execute(f"""
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = '{table_name}'
            """)
            
            if cursor.fetchone()[0] == 0:
                print(f"❌ 表 {table_name} 不存在")
                return
            
            # 获取表结构
            cursor.execute(f"""
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    CHARACTER_MAXIMUM_LENGTH,
                    IS_NULLABLE,
                    COLUMN_DEFAULT,
                    COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA+'.'+TABLE_NAME), COLUMN_NAME, 'IsIdentity') as IS_IDENTITY
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '{table_name}'
                ORDER BY ORDINAL_POSITION
            """)
            
            columns = cursor.fetchall()
            
            print(f"📊 本地表 {table_name} 的列结构:")
            for col in columns:
                col_name = col[0]
                data_type = col[1]
                max_length = col[2] if col[2] else ""
                is_nullable = col[3]
                default_val = col[4] if col[4] else ""
                is_identity = col[5]
                
                identity_str = " IDENTITY" if is_identity else ""
                print(f"  - {col_name}: {data_type}{f'({max_length})' if max_length else ''}{identity_str} {'NULL' if is_nullable == 'YES' else 'NOT NULL'} {f'DEFAULT {default_val}' if default_val else ''}")
            
            # 获取记录数
            cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
            count = cursor.fetchone()[0]
            print(f"📊 表 {table_name} 当前有 {count} 条记录")
            
            # 如果有数据，显示前几行
            if count > 0:
                cursor.execute(f"SELECT TOP 3 * FROM [{table_name}]")
                rows = cursor.fetchall()
                
                # 打印列名
                column_names = [desc[0] for desc in cursor.description]
                print("  前3行数据:")
                print("  列名:", " | ".join(column_names))
                print("  " + "-" * 80)
                
                # 打印数据
                for row in rows:
                    row_data = []
                    for item in row:
                        if item is None:
                            row_data.append("NULL")
                        elif isinstance(item, str) and len(item) > 15:
                            row_data.append(item[:15] + "...")
                        else:
                            row_data.append(str(item))
                    print("  " + " | ".join(row_data))
                
    except Exception as e:
        print(f"❌ 检查本地表 {table_name} 失败: {e}")

def main():
    print("=" * 60)
    print("🔍 检查本地数据库表结构")
    print("=" * 60)
    
    # 检查需要复制的表
    tables_to_check = ['region_hierarchy', 'city']
    
    for table in tables_to_check:
        check_table_structure(table)
    
    print("\n" + "=" * 60)
    print("检查完成")
    print("=" * 60)

if __name__ == "__main__":
    main()
