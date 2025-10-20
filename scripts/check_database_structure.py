#!/usr/bin/env python3
"""
检查数据库结构，特别是stores表的坐标数据
"""

import os
import sys
import pyodbc

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def check_database():
    """检查数据库结构和数据"""
    
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
        
        print("🔍 检查hotdog2030数据库结构...")
        
        # 检查stores表结构
        print("\n📋 stores表结构:")
        cursor.execute("""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'stores' AND TABLE_SCHEMA = 'dbo'
            ORDER BY ORDINAL_POSITION
        """)
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")
        
        # 检查stores表数据
        print("\n📊 stores表数据统计:")
        cursor.execute("SELECT COUNT(*) FROM dbo.stores")
        total_stores = cursor.fetchone()[0]
        print(f"  总门店数: {total_stores}")
        
        cursor.execute("SELECT COUNT(*) FROM dbo.stores WHERE longitude IS NOT NULL AND latitude IS NOT NULL")
        stores_with_coords = cursor.fetchone()[0]
        print(f"  有坐标的门店数: {stores_with_coords}")
        
        # 检查坐标数据示例
        if stores_with_coords > 0:
            print("\n📍 坐标数据示例:")
            cursor.execute("""
                SELECT TOP 5 id, store_name, city, longitude, latitude 
                FROM dbo.stores 
                WHERE longitude IS NOT NULL AND latitude IS NOT NULL
            """)
            for row in cursor.fetchall():
                print(f"  {row[0]}: {row[1]} ({row[2]}) - [{row[3]}, {row[4]}]")
        
        # 检查vw_kpi_store_daily视图
        print("\n📊 vw_kpi_store_daily视图结构:")
        try:
            cursor.execute("""
                SELECT COLUMN_NAME, DATA_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'vw_kpi_store_daily' AND TABLE_SCHEMA = 'dbo'
                ORDER BY ORDINAL_POSITION
            """)
            for row in cursor.fetchall():
                print(f"  {row[0]}: {row[1]}")
        except Exception as e:
            print(f"  ❌ 视图不存在或无法访问: {e}")
        
        # 检查cyrgweixin数据库的Rg_SeekShop表
        print("\n🔍 检查cyrgweixin数据库...")
        try:
            cursor.execute("USE cyrgweixin")
            cursor.execute("SELECT COUNT(*) FROM dbo.Rg_SeekShop WHERE Delflag=0")
            total_candidates = cursor.fetchone()[0]
            print(f"  候选点总数: {total_candidates}")
            
            cursor.execute("""
                SELECT COUNT(*) FROM dbo.Rg_SeekShop 
                WHERE Delflag=0 AND location IS NOT NULL AND location LIKE '%,%'
            """)
            candidates_with_coords = cursor.fetchone()[0]
            print(f"  有坐标的候选点数: {candidates_with_coords}")
            
            if candidates_with_coords > 0:
                print("\n📍 候选点坐标数据示例:")
                cursor.execute("""
                    SELECT TOP 5 Id, ShopName, ShopAddress, location 
                    FROM dbo.Rg_SeekShop 
                    WHERE Delflag=0 AND location IS NOT NULL AND location LIKE '%,%'
                """)
                for row in cursor.fetchall():
                    print(f"  {row[0]}: {row[1]} - {row[2]} - {row[3]}")
        except Exception as e:
            print(f"  ❌ 无法访问cyrgweixin数据库: {e}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")

if __name__ == "__main__":
    check_database()
