#!/usr/bin/env python3
"""
检查RDS中表的结构
"""

import pyodbc

# RDS数据库配置
RDS_CONFIG = {
    'server': 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
    'port': 1433,
    'database': 'hotdog2030',
    'username': 'hotdog',
    'password': 'Zhkj@62102218',
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
    print(f"\n🔍 检查表 {table_name} 的结构:")
    
    try:
        conn_str = get_connection_string(RDS_CONFIG)
        
        with pyodbc.connect(conn_str) as conn:
            cursor = conn.cursor()
            
            # 获取表结构
            cursor.execute(f"""
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    CHARACTER_MAXIMUM_LENGTH,
                    IS_NULLABLE,
                    COLUMN_DEFAULT
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '{table_name}'
                ORDER BY ORDINAL_POSITION
            """)
            
            columns = cursor.fetchall()
            
            if len(columns) == 0:
                print(f"❌ 表 {table_name} 不存在")
                return
            
            print(f"📊 表 {table_name} 的列结构:")
            for col in columns:
                col_name = col[0]
                data_type = col[1]
                max_length = col[2] if col[2] else ""
                is_nullable = col[3]
                default_val = col[4] if col[4] else ""
                
                print(f"  - {col_name}: {data_type}{f'({max_length})' if max_length else ''} {'NULL' if is_nullable == 'YES' else 'NOT NULL'} {f'DEFAULT {default_val}' if default_val else ''}")
            
            # 获取前几行数据作为示例
            print(f"\n📋 表 {table_name} 的前5行数据:")
            cursor.execute(f"SELECT TOP 5 * FROM [{table_name}]")
            rows = cursor.fetchall()
            
            if len(rows) > 0:
                # 打印列名
                column_names = [desc[0] for desc in cursor.description]
                print("  列名:", " | ".join(column_names))
                print("  " + "-" * 80)
                
                # 打印数据
                for row in rows:
                    row_data = []
                    for item in row:
                        if item is None:
                            row_data.append("NULL")
                        elif isinstance(item, str) and len(item) > 20:
                            row_data.append(item[:20] + "...")
                        else:
                            row_data.append(str(item))
                    print("  " + " | ".join(row_data))
            else:
                print("  表为空")
                
    except Exception as e:
        print(f"❌ 检查表 {table_name} 失败: {e}")

def main():
    print("=" * 60)
    print("🔍 检查RDS表结构")
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
