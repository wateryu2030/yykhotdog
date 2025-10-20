#!/usr/bin/env python3
"""
为stores表添加坐标数据
"""

import os
import sys
import pyodbc
import random

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def update_stores_coordinates():
    """为stores表添加坐标数据"""
    
    # 数据库连接配置
    conn_str = (
        "DRIVER={ODBC Driver 17 for SQL Server};"
        "SERVER=localhost,1433;"
        "DATABASE=hotdog2030;"
        "UID=sa;"
        "PWD=YourStrong@Passw0rd;"
    )
    
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        print("🔍 检查stores表当前状态...")
        
        # 检查当前坐标数据
        cursor.execute("SELECT COUNT(*) FROM dbo.stores WHERE longitude IS NOT NULL AND latitude IS NOT NULL")
        stores_with_coords = cursor.fetchone()[0]
        print(f"  当前有坐标的门店数: {stores_with_coords}")
        
        # 获取没有坐标的门店
        cursor.execute("""
            SELECT id, store_name, city 
            FROM dbo.stores 
            WHERE longitude IS NULL OR latitude IS NULL
        """)
        stores_without_coords = cursor.fetchall()
        print(f"  需要添加坐标的门店数: {len(stores_without_coords)}")
        
        if len(stores_without_coords) == 0:
            print("✅ 所有门店都有坐标数据")
            return
        
        # 为每个城市定义坐标范围
        city_coordinates = {
            '沈阳市': {'center': [123.4, 41.8], 'range': 0.1},
            '仙桃市': {'center': [113.4, 30.4], 'range': 0.05},
            '滨州市': {'center': [118.0, 37.4], 'range': 0.05},
            '辽阳市': {'center': [123.2, 41.3], 'range': 0.05},
        }
        
        print("\n📍 开始添加坐标数据...")
        
        for store in stores_without_coords:
            store_id, store_name, city = store
            
            # 获取城市坐标范围
            if city in city_coordinates:
                center = city_coordinates[city]['center']
                range_val = city_coordinates[city]['range']
                
                # 生成随机坐标（在城市范围内）
                longitude = center[0] + random.uniform(-range_val, range_val)
                latitude = center[1] + random.uniform(-range_val, range_val)
                
                # 更新坐标
                cursor.execute("""
                    UPDATE dbo.stores 
                    SET longitude = ?, latitude = ?
                    WHERE id = ?
                """, longitude, latitude, store_id)
                
                print(f"  ✅ {store_name} ({city}): [{longitude:.6f}, {latitude:.6f}]")
            else:
                print(f"  ⚠️  {store_name} ({city}): 未知城市，跳过")
        
        conn.commit()
        print(f"\n🎉 成功为 {len(stores_without_coords)} 个门店添加了坐标数据")
        
        # 验证结果
        cursor.execute("SELECT COUNT(*) FROM dbo.stores WHERE longitude IS NOT NULL AND latitude IS NOT NULL")
        final_count = cursor.fetchone()[0]
        print(f"  最终有坐标的门店数: {final_count}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ 更新失败: {e}")

if __name__ == "__main__":
    update_stores_coordinates()
