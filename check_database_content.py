#!/usr/bin/env python3
"""
检查数据库内容是否完整
"""
import pymssql
import sys

def check_database_content():
    """检查数据库内容"""
    try:
        # 连接配置
        server = 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com'
        user = 'hotdog'
        password = 'Zhkj@62102218'
        
        print("🔍 检查数据库内容...")
        print("=" * 50)
        
        # 检查cyrg2025数据库
        print("\n📊 检查 cyrg2025 数据库:")
        try:
            conn = pymssql.connect(
                server=server,
                port=1433,
                user=user,
                password=password,
                database='cyrg2025'
            )
            cursor = conn.cursor()
            
            # 获取表数量
            cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_type = 'BASE TABLE'")
            table_count = cursor.fetchone()[0]
            print(f"  ✅ 表数量: {table_count}")
            
            # 获取表列表
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' ORDER BY table_name")
            tables = cursor.fetchall()
            print(f"  📋 表列表: {[table[0] for table in tables[:10]]}{'...' if len(tables) > 10 else ''}")
            
            # 检查主要表的数据量
            if tables:
                main_table = tables[0][0]
                cursor.execute(f"SELECT COUNT(*) FROM [{main_table}]")
                row_count = cursor.fetchone()[0]
                print(f"  📈 主表 {main_table} 数据量: {row_count} 行")
            
            conn.close()
            print("  ✅ cyrg2025 数据库连接正常")
            
        except Exception as e:
            print(f"  ❌ cyrg2025 数据库检查失败: {e}")
        
        # 检查cyrgweixin数据库
        print("\n📊 检查 cyrgweixin 数据库:")
        try:
            conn = pymssql.connect(
                server=server,
                port=1433,
                user=user,
                password=password,
                database='cyrgweixin'
            )
            cursor = conn.cursor()
            
            # 获取表数量
            cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_type = 'BASE TABLE'")
            table_count = cursor.fetchone()[0]
            print(f"  ✅ 表数量: {table_count}")
            
            # 获取表列表
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' ORDER BY table_name")
            tables = cursor.fetchall()
            print(f"  📋 表列表: {[table[0] for table in tables[:10]]}{'...' if len(tables) > 10 else ''}")
            
            # 检查主要表的数据量
            if tables:
                main_table = tables[0][0]
                cursor.execute(f"SELECT COUNT(*) FROM [{main_table}]")
                row_count = cursor.fetchone()[0]
                print(f"  📈 主表 {main_table} 数据量: {row_count} 行")
            
            conn.close()
            print("  ✅ cyrgweixin 数据库连接正常")
            
        except Exception as e:
            print(f"  ❌ cyrgweixin 数据库检查失败: {e}")
            
        print("\n" + "=" * 50)
        print("🎉 数据库内容检查完成!")
        
    except Exception as e:
        print(f"❌ 检查失败: {e}")
        return False
    
    return True

if __name__ == "__main__":
    check_database_content()
