#!/usr/bin/env python3
"""
检查RDS数据库中的数据
"""
import pymssql

def check_database_data():
    """检查数据库数据"""
    try:
        # 连接RDS
        conn = pymssql.connect(
            server='rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com',
            port=1433,
            user='hotdog',
            password='Zhkj@62102218',
            database='hotdog2030'
        )
        
        cursor = conn.cursor()
        
        # 检查hotdog2030数据库中的表
        print("📋 检查hotdog2030数据库中的表...")
        cursor.execute("""
            SELECT TABLE_NAME, TABLE_TYPE 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        """)
        tables = cursor.fetchall()
        
        print(f"📊 hotdog2030数据库中共有 {len(tables)} 个表:")
        for table in tables:
            table_name = table[0]
            cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
            count = cursor.fetchone()[0]
            print(f"  - {table_name}: {count:,} 条记录")
        
        # 检查cyrg2025数据库
        print("\n📋 检查cyrg2025数据库...")
        cursor.execute("USE cyrg2025")
        cursor.execute("""
            SELECT TABLE_NAME, TABLE_TYPE 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        """)
        cyrg_tables = cursor.fetchall()
        
        print(f"📊 cyrg2025数据库中共有 {len(cyrg_tables)} 个表:")
        for table in cyrg_tables[:10]:  # 只显示前10个表
            table_name = table[0]
            cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
            count = cursor.fetchone()[0]
            print(f"  - {table_name}: {count:,} 条记录")
        
        if len(cyrg_tables) > 10:
            print(f"  ... 还有 {len(cyrg_tables) - 10} 个表")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 检查数据失败: {e}")
        return False

if __name__ == "__main__":
    check_database_data()
