#!/usr/bin/env python3
"""
从RDS的hotdog2030数据库复制地区级联数据到本地hotdog2030数据库
"""

import pyodbc
import json
import sys
from datetime import datetime

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

def test_connection(config, name):
    """测试数据库连接"""
    try:
        conn_str = get_connection_string(config)
        print(f"🔍 测试{name}连接...")
        print(f"服务器: {config['server']}")
        print(f"数据库: {config['database']}")
        
        with pyodbc.connect(conn_str) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT @@VERSION")
            version = cursor.fetchone()[0]
            print(f"✅ {name}连接成功")
            print(f"版本: {version[:100]}...")
            return True
    except Exception as e:
        print(f"❌ {name}连接失败: {e}")
        return False

def get_table_structure(conn, table_name):
    """获取表结构"""
    cursor = conn.cursor()
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
    return cursor.fetchall()

def table_exists(conn, table_name):
    """检查表是否存在"""
    cursor = conn.cursor()
    cursor.execute(f"""
        SELECT COUNT(*) 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = '{table_name}'
    """)
    return cursor.fetchone()[0] > 0

def copy_region_hierarchy_data():
    """复制region_hierarchy表数据"""
    print("\n🔄 开始复制region_hierarchy表数据...")
    
    try:
        # 连接RDS
        rds_conn_str = get_connection_string(RDS_CONFIG)
        local_conn_str = get_connection_string(LOCAL_CONFIG)
        
        with pyodbc.connect(rds_conn_str) as rds_conn:
            with pyodbc.connect(local_conn_str) as local_conn:
                rds_cursor = rds_conn.cursor()
                local_cursor = local_conn.cursor()
                
                # 检查RDS表是否存在
                if not table_exists(rds_conn, 'region_hierarchy'):
                    print("❌ RDS中不存在region_hierarchy表")
                    return False
                
                # 获取RDS数据
                print("📊 从RDS获取region_hierarchy数据...")
                rds_cursor.execute("""
                    SELECT code, name, level, parent_code, sort_order, is_active, created_at, updated_at
                    FROM region_hierarchy
                    ORDER BY level, id
                """)
                
                rds_data = rds_cursor.fetchall()
                print(f"📊 从RDS获取到 {len(rds_data)} 条记录")
                
                if len(rds_data) == 0:
                    print("⚠️ RDS中region_hierarchy表为空")
                    return False
                
                # 清空本地表
                print("🗑️ 清空本地region_hierarchy表...")
                local_cursor.execute("DELETE FROM region_hierarchy")
                
                # 插入数据
                print("📥 插入数据到本地数据库...")
                insert_sql = """
                    INSERT INTO region_hierarchy (code, name, level, parent_code, sort_order, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """
                
                batch_size = 100
                for i in range(0, len(rds_data), batch_size):
                    batch = rds_data[i:i+batch_size]
                    local_cursor.executemany(insert_sql, batch)
                    local_conn.commit()
                    print(f"✅ 已插入 {min(i+batch_size, len(rds_data))}/{len(rds_data)} 条记录")
                
                # 验证数据
                local_cursor.execute("SELECT COUNT(*) FROM region_hierarchy")
                local_count = local_cursor.fetchone()[0]
                print(f"✅ 本地region_hierarchy表现有 {local_count} 条记录")
                
                return True
                
    except Exception as e:
        print(f"❌ 复制region_hierarchy数据失败: {e}")
        return False

def copy_city_data():
    """复制city表数据"""
    print("\n🔄 开始复制city表数据...")
    
    try:
        rds_conn_str = get_connection_string(RDS_CONFIG)
        local_conn_str = get_connection_string(LOCAL_CONFIG)
        
        with pyodbc.connect(rds_conn_str) as rds_conn:
            with pyodbc.connect(local_conn_str) as local_conn:
                rds_cursor = rds_conn.cursor()
                local_cursor = local_conn.cursor()
                
                # 检查RDS表是否存在
                if not table_exists(rds_conn, 'city'):
                    print("❌ RDS中不存在city表")
                    return False
                
                # 获取RDS数据
                print("📊 从RDS获取city数据...")
                rds_cursor.execute("""
                    SELECT city_name, province, region, created_at, updated_at, delflag
                    FROM city
                    ORDER BY id
                """)
                
                rds_data = rds_cursor.fetchall()
                print(f"📊 从RDS获取到 {len(rds_data)} 条记录")
                
                if len(rds_data) == 0:
                    print("⚠️ RDS中city表为空")
                    return False
                
                # 清空本地表
                print("🗑️ 清空本地city表...")
                local_cursor.execute("DELETE FROM city")
                
                # 插入数据
                print("📥 插入数据到本地数据库...")
                insert_sql = """
                    INSERT INTO city (city_name, province, region, created_at, updated_at, delflag)
                    VALUES (?, ?, ?, ?, ?, ?)
                """
                
                batch_size = 100
                for i in range(0, len(rds_data), batch_size):
                    batch = rds_data[i:i+batch_size]
                    local_cursor.executemany(insert_sql, batch)
                    local_conn.commit()
                    print(f"✅ 已插入 {min(i+batch_size, len(rds_data))}/{len(rds_data)} 条记录")
                
                # 验证数据
                local_cursor.execute("SELECT COUNT(*) FROM city")
                local_count = local_cursor.fetchone()[0]
                print(f"✅ 本地city表现有 {local_count} 条记录")
                
                return True
                
    except Exception as e:
        print(f"❌ 复制city数据失败: {e}")
        return False

def list_rds_tables():
    """列出RDS中的所有表"""
    print("\n📋 列出RDS中的所有表...")
    
    try:
        rds_conn_str = get_connection_string(RDS_CONFIG)
        
        with pyodbc.connect(rds_conn_str) as rds_conn:
            cursor = rds_conn.cursor()
            cursor.execute("""
                SELECT TABLE_NAME, TABLE_TYPE
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_NAME
            """)
            
            tables = cursor.fetchall()
            print(f"📊 RDS中共有 {len(tables)} 个表:")
            
            for table in tables:
                table_name = table[0]
                cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
                count = cursor.fetchone()[0]
                print(f"  - {table_name}: {count:,} 条记录")
            
            return tables
            
    except Exception as e:
        print(f"❌ 列出RDS表失败: {e}")
        return []

def main():
    print("=" * 60)
    print("🌍 从RDS复制地区级联数据到本地数据库")
    print("=" * 60)
    
    # 测试连接
    if not test_connection(RDS_CONFIG, "RDS数据库"):
        print("❌ RDS连接失败，请检查配置")
        sys.exit(1)
    
    if not test_connection(LOCAL_CONFIG, "本地数据库"):
        print("❌ 本地数据库连接失败，请检查配置")
        sys.exit(1)
    
    # 列出RDS中的表
    list_rds_tables()
    
    # 复制数据
    success_count = 0
    
    if copy_region_hierarchy_data():
        success_count += 1
    
    if copy_city_data():
        success_count += 1
    
    print("\n" + "=" * 60)
    if success_count == 2:
        print("🎉 所有数据复制完成！")
    elif success_count > 0:
        print(f"⚠️ 部分数据复制完成 ({success_count}/2)")
    else:
        print("❌ 数据复制失败")
    print("=" * 60)

if __name__ == "__main__":
    main()
