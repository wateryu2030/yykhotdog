#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复地区数据复制脚本 - 适配RDS和本地表结构差异
"""

import pyodbc
import sys

# RDS连接配置
RDS_CONFIG = {
    'server': 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
    'port': 1433,
    'database': 'hotdog2030',
    'username': 'hotdog',
    'password': 'Zhkj@62102218',
    'driver': '{ODBC Driver 18 for SQL Server}',
    'timeout': 30
}

# 本地数据库连接配置
LOCAL_CONFIG = {
    'server': 'localhost',
    'port': 1433,
    'database': 'hotdog2030',
    'username': 'sa',
    'password': 'YourStrong@Passw0rd',
    'driver': '{ODBC Driver 18 for SQL Server}',
    'timeout': 30
}

def connect_database(config, db_name):
    """连接数据库"""
    try:
        conn_str = f"DRIVER={config['driver']};SERVER={config['server']},{config['port']};DATABASE={config['database']};UID={config['username']};PWD={config['password']};TrustServerCertificate=yes;Encrypt=yes;"
        conn = pyodbc.connect(conn_str, timeout=config['timeout'])
        print(f"✅ {db_name}数据库连接成功")
        return conn
    except Exception as e:
        print(f"❌ {db_name}数据库连接失败: {e}")
        return None

def copy_region_hierarchy_data():
    """复制region_hierarchy表数据"""
    print("\n🔄 开始复制region_hierarchy表数据...")
    
    # 连接RDS和本地数据库
    rds_conn = connect_database(RDS_CONFIG, "RDS")
    local_conn = connect_database(LOCAL_CONFIG, "本地")
    
    if not rds_conn or not local_conn:
        return False
    
    try:
        rds_cursor = rds_conn.cursor()
        local_cursor = local_conn.cursor()
        
        # 从RDS获取数据 - 使用name字段作为region_name
        print("📊 从RDS获取region_hierarchy数据...")
        rds_cursor.execute("""
            SELECT id, name as region_name, code, name, level, parent_code, 
                   full_name, sort_order, is_active, created_at, updated_at
            FROM region_hierarchy
            ORDER BY id
        """)
        
        rds_data = rds_cursor.fetchall()
        print(f"📊 从RDS获取到 {len(rds_data)} 条记录")
        
        if not rds_data:
            print("⚠️ RDS中没有region_hierarchy数据")
            return True
        
        # 清空本地表
        print("🗑️ 清空本地region_hierarchy表...")
        local_cursor.execute("DELETE FROM region_hierarchy")
        local_conn.commit()
        
        # 插入数据到本地数据库
        print("📥 插入数据到本地数据库...")
        insert_sql = """
            INSERT INTO region_hierarchy 
            (id, region_name, code, name, level, parent_code, full_name, sort_order, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        for row in rds_data:
            try:
                local_cursor.execute(insert_sql, row)
                success_count += 1
            except Exception as e:
                print(f"⚠️ 插入记录失败 (ID: {row[0]}): {e}")
        
        local_conn.commit()
        print(f"✅ 已插入 {success_count}/{len(rds_data)} 条记录")
        
        # 验证本地数据
        local_cursor.execute("SELECT COUNT(*) FROM region_hierarchy")
        local_count = local_cursor.fetchone()[0]
        print(f"✅ 本地region_hierarchy表现有 {local_count} 条记录")
        
        return True
        
    except Exception as e:
        print(f"❌ 复制region_hierarchy数据失败: {e}")
        return False
    finally:
        if rds_conn:
            rds_conn.close()
        if local_conn:
            local_conn.close()

def copy_city_data():
    """复制city表数据"""
    print("\n🔄 开始复制city表数据...")
    
    # 连接RDS和本地数据库
    rds_conn = connect_database(RDS_CONFIG, "RDS")
    local_conn = connect_database(LOCAL_CONFIG, "本地")
    
    if not rds_conn or not local_conn:
        return False
    
    try:
        rds_cursor = rds_conn.cursor()
        local_cursor = local_conn.cursor()
        
        # 从RDS获取数据
        print("📊 从RDS获取city数据...")
        rds_cursor.execute("""
            SELECT id, city_name, province, region, created_at, updated_at, delflag
            FROM city
            ORDER BY id
        """)
        
        rds_data = rds_cursor.fetchall()
        print(f"📊 从RDS获取到 {len(rds_data)} 条记录")
        
        if not rds_data:
            print("⚠️ RDS中没有city数据")
            return True
        
        # 清空本地表
        print("🗑️ 清空本地city表...")
        local_cursor.execute("DELETE FROM city")
        local_conn.commit()
        
        # 插入数据到本地数据库
        print("📥 插入数据到本地数据库...")
        insert_sql = """
            INSERT INTO city 
            (id, city_name, province, region, created_at, updated_at, delflag)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        for row in rds_data:
            try:
                local_cursor.execute(insert_sql, row)
                success_count += 1
            except Exception as e:
                print(f"⚠️ 插入记录失败 (ID: {row[0]}): {e}")
        
        local_conn.commit()
        print(f"✅ 已插入 {success_count}/{len(rds_data)} 条记录")
        
        # 验证本地数据
        local_cursor.execute("SELECT COUNT(*) FROM city")
        local_count = local_cursor.fetchone()[0]
        print(f"✅ 本地city表现有 {local_count} 条记录")
        
        return True
        
    except Exception as e:
        print(f"❌ 复制city数据失败: {e}")
        return False
    finally:
        if rds_conn:
            rds_conn.close()
        if local_conn:
            local_conn.close()

def main():
    print("=" * 60)
    print("🌍 修复地区级联数据复制 (适配表结构差异)")
    print("=" * 60)
    
    # 复制region_hierarchy数据
    region_success = copy_region_hierarchy_data()
    
    # 复制city数据
    city_success = copy_city_data()
    
    # 总结
    print("\n" + "=" * 60)
    if region_success and city_success:
        print("✅ 所有数据复制完成")
    elif region_success or city_success:
        print("⚠️ 部分数据复制完成")
    else:
        print("❌ 数据复制失败")
    print("=" * 60)

if __name__ == "__main__":
    main()
