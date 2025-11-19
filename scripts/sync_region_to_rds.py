#!/usr/bin/env python3
"""
从本机hotdog2030数据库复制地区级联数据到RDS上的hotdog2030数据库
"""

import pymssql
import sys

# 本机数据库配置
LOCAL_CONFIG = {
    "server": "localhost",  # 或你的本机SQL Server地址
    "port": 1433,
    "user": "sa",  # 根据实际情况修改
    "password": "your_local_password",  # 根据实际情况修改
    "database": "hotdog2030",
}

# RDS数据库配置
RDS_CONFIG = {
    "server": "rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com",
    "port": 1433,
    "user": "hotdog",
    "password": "Zhkj@62102218",
    "database": "hotdog2030",
}


def sync_region_hierarchy():
    """同步region_hierarchy表数据"""
    print("\n🔄 开始同步region_hierarchy表数据...")
    
    try:
        # 连接本机数据库
        local_conn = pymssql.connect(**LOCAL_CONFIG)
        local_cur = local_conn.cursor()
        
        # 连接RDS数据库
        rds_conn = pymssql.connect(**RDS_CONFIG)
        rds_cur = rds_conn.cursor()
        
        # 从本机获取数据
        print("📊 从本机获取region_hierarchy数据...")
        local_cur.execute("""
            SELECT id, code, name, level, parent_id, parent_code, full_name, sort_order, is_active, created_at, updated_at
            FROM region_hierarchy
            ORDER BY level, id
        """)
        
        local_data = local_cur.fetchall()
        print(f"📊 从本机获取到 {len(local_data)} 条记录")
        
        if len(local_data) == 0:
            print("⚠️ 本机region_hierarchy表为空")
            local_conn.close()
            rds_conn.close()
            return False
        
        # 清空RDS表
        print("🗑️ 清空RDS region_hierarchy表...")
        rds_cur.execute("DELETE FROM region_hierarchy")
        rds_conn.commit()
        
        # 插入数据到RDS
        print("📥 插入数据到RDS数据库...")
        insert_sql = """
            INSERT INTO region_hierarchy (id, code, name, level, parent_id, parent_code, full_name, sort_order, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        batch_size = 100
        for i in range(0, len(local_data), batch_size):
            batch = local_data[i:i+batch_size]
            rds_cur.executemany(insert_sql, batch)
            rds_conn.commit()
            print(f"✅ 已插入 {min(i+batch_size, len(local_data))}/{len(local_data)} 条记录")
        
        # 验证数据
        rds_cur.execute("SELECT COUNT(*) FROM region_hierarchy")
        rds_count = rds_cur.fetchone()[0]
        print(f"✅ RDS region_hierarchy表现有 {rds_count} 条记录")
        
        local_conn.close()
        rds_conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 同步region_hierarchy数据失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def sync_city():
    """同步city表数据"""
    print("\n🔄 开始同步city表数据...")
    
    try:
        # 连接本机数据库
        local_conn = pymssql.connect(**LOCAL_CONFIG)
        local_cur = local_conn.cursor()
        
        # 连接RDS数据库
        rds_conn = pymssql.connect(**RDS_CONFIG)
        rds_cur = rds_conn.cursor()
        
        # 从本机获取数据
        print("📊 从本机获取city数据...")
        local_cur.execute("""
            SELECT id, city_name, province, region, created_at, updated_at, delflag
            FROM city
            ORDER BY id
        """)
        
        local_data = local_cur.fetchall()
        print(f"📊 从本机获取到 {len(local_data)} 条记录")
        
        if len(local_data) == 0:
            print("⚠️ 本机city表为空")
            local_conn.close()
            rds_conn.close()
            return False
        
        # 清空RDS表
        print("🗑️ 清空RDS city表...")
        rds_cur.execute("DELETE FROM city")
        rds_conn.commit()
        
        # 插入数据到RDS
        print("📥 插入数据到RDS数据库...")
        insert_sql = """
            INSERT INTO city (id, city_name, province, region, created_at, updated_at, delflag)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        
        batch_size = 100
        for i in range(0, len(local_data), batch_size):
            batch = local_data[i:i+batch_size]
            rds_cur.executemany(insert_sql, batch)
            rds_conn.commit()
            print(f"✅ 已插入 {min(i+batch_size, len(local_data))}/{len(local_data)} 条记录")
        
        # 验证数据
        rds_cur.execute("SELECT COUNT(*) FROM city")
        rds_count = rds_cur.fetchone()[0]
        print(f"✅ RDS city表现有 {rds_count} 条记录")
        
        local_conn.close()
        rds_conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 同步city数据失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("=" * 60)
    print("🌍 从本机hotdog2030复制地区级联数据到RDS hotdog2030")
    print("=" * 60)
    
    # 测试连接
    try:
        print("🔍 测试本机数据库连接...")
        test_local = pymssql.connect(**LOCAL_CONFIG)
        test_local.close()
        print("✅ 本机数据库连接成功")
    except Exception as e:
        print(f"❌ 本机数据库连接失败: {e}")
        print("⚠️ 请检查LOCAL_CONFIG配置（server, user, password）")
        sys.exit(1)
    
    try:
        print("🔍 测试RDS数据库连接...")
        test_rds = pymssql.connect(**RDS_CONFIG)
        test_rds.close()
        print("✅ RDS数据库连接成功")
    except Exception as e:
        print(f"❌ RDS数据库连接失败: {e}")
        sys.exit(1)
    
    # 同步数据
    success_count = 0
    
    if sync_region_hierarchy():
        success_count += 1
    
    if sync_city():
        success_count += 1
    
    print("\n" + "=" * 60)
    if success_count == 2:
        print("🎉 所有数据同步完成！")
    elif success_count > 0:
        print(f"⚠️ 部分数据同步完成 ({success_count}/2)")
    else:
        print("❌ 数据同步失败")
    print("=" * 60)


if __name__ == "__main__":
    main()

