#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
导入订单商品数据从cyrg2025到hotdog2030
"""

import pyodbc
import sys

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

# cyrg2025数据库连接配置
CYRG2025_CONFIG = {
    'server': 'localhost',
    'port': 1433,
    'database': 'cyrg2025',
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

def import_order_items():
    """导入订单商品数据"""
    print("\n🔄 开始导入订单商品数据...")
    
    # 连接数据库
    cyrg_conn = connect_database(CYRG2025_CONFIG, "cyrg2025")
    local_conn = connect_database(LOCAL_CONFIG, "hotdog2030")
    
    if not cyrg_conn or not local_conn:
        return False
    
    try:
        cyrg_cursor = cyrg_conn.cursor()
        local_cursor = local_conn.cursor()
        
        # 从cyrg2025获取订单商品数据
        print("📊 从cyrg2025获取订单商品数据...")
        cyrg_cursor.execute("""
            SELECT 
                og.id,
                og.orderId,
                og.goodsId,
                og.goodsName,
                og.goodsNumber,
                og.goodsPrice,
                og.goodsTotal,
                og.recordTime,
                og.shopId
            FROM OrderGoods og
            WHERE og.delflag = 0
            ORDER BY og.id
        """)
        
        order_goods_data = cyrg_cursor.fetchall()
        print(f"📊 从cyrg2025获取到 {len(order_goods_data)} 条订单商品记录")
        
        if not order_goods_data:
            print("⚠️ cyrg2025中没有订单商品数据")
            return True
        
        # 清空本地order_items表
        print("🗑️ 清空本地order_items表...")
        local_cursor.execute("DELETE FROM order_items")
        local_conn.commit()
        
        # 导入数据到本地数据库
        print("📥 导入数据到本地数据库...")
        insert_sql = """
            INSERT INTO order_items 
            (id, order_id, product_id, product_name, quantity, price, total_price, created_at, updated_at, delflag)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        batch_size = 1000
        
        for i, row in enumerate(order_goods_data):
            try:
                # 将recordTime转换为datetime格式
                import datetime
                if row[7]:  # recordTime
                    try:
                        created_at = datetime.datetime.strptime(row[7], '%Y-%m-%d %H:%M:%S')
                    except:
                        created_at = datetime.datetime.now()
                else:
                    created_at = datetime.datetime.now()
                
                values = (
                    row[0],  # id
                    row[1],  # orderId
                    row[2],  # goodsId
                    row[3],  # goodsName
                    row[4],  # goodsNumber
                    row[5],  # goodsPrice
                    row[6],  # goodsTotal
                    created_at,  # created_at
                    created_at,  # updated_at
                    0  # delflag
                )
                local_cursor.execute(insert_sql, values)
                success_count += 1
                
                # 批量提交
                if (i + 1) % batch_size == 0:
                    local_conn.commit()
                    print(f"  已处理 {i + 1}/{len(order_goods_data)} 条记录...")
                    
            except Exception as e:
                print(f"⚠️ 插入记录失败 (ID: {row[0]}): {e}")
        
        local_conn.commit()
        print(f"✅ 已导入 {success_count}/{len(order_goods_data)} 条记录")
        
        # 验证本地数据
        local_cursor.execute("SELECT COUNT(*) FROM order_items")
        local_count = local_cursor.fetchone()[0]
        print(f"✅ 本地order_items表现有 {local_count} 条记录")
        
        return True
        
    except Exception as e:
        print(f"❌ 导入订单商品数据失败: {e}")
        return False
    finally:
        if cyrg_conn:
            cyrg_conn.close()
        if local_conn:
            local_conn.close()

def main():
    print("=" * 60)
    print("🛒 导入订单商品数据")
    print("=" * 60)
    
    # 导入订单商品数据
    success = import_order_items()
    
    # 总结
    print("\n" + "=" * 60)
    if success:
        print("✅ 订单商品数据导入完成")
    else:
        print("❌ 订单商品数据导入失败")
    print("=" * 60)

if __name__ == "__main__":
    main()
