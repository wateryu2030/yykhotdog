#!/usr/bin/env python3
"""
检查数据库状态脚本
"""

import pyodbc
import sys

# 数据库连接配置
SERVER = "rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com,1433"
USERNAME = "hotdog"
PASSWORD = "Zhkj@62102218"
DRIVER = "ODBC Driver 18 for SQL Server"

def get_connection():
    """获取数据库连接"""
    try:
        connection_string = f"DRIVER={{{DRIVER}}};SERVER={SERVER};UID={USERNAME};PWD={PASSWORD};Encrypt=no;TrustServerCertificate=yes;Connection Timeout=30;"
        conn = pyodbc.connect(connection_string, autocommit=True)
        return conn
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return None

def check_database_status(conn):
    """检查数据库状态"""
    try:
        cursor = conn.cursor()
        
        # 检查数据库是否存在
        cursor.execute("SELECT name, state_desc FROM sys.databases WHERE name IN ('cyrg2025', 'cyrg202509') ORDER BY name")
        databases = cursor.fetchall()
        
        print("📊 数据库状态检查:")
        print("=" * 50)
        
        for db_name, state in databases:
            print(f"✅ {db_name}: {state}")
            
            # 检查每个数据库的表数量
            try:
                cursor.execute(f"USE [{db_name}]")
                cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
                table_count = cursor.fetchone()[0]
                print(f"   📋 表数量: {table_count}")
                
                # 检查总记录数
                cursor.execute("""
                    SELECT 
                        SUM(p.rows) as total_rows
                    FROM sys.tables t
                    INNER JOIN sys.partitions p ON t.object_id = p.object_id
                    WHERE p.index_id IN (0,1)
                """)
                total_rows = cursor.fetchone()[0]
                if total_rows:
                    print(f"   📊 总记录数: {total_rows:,}")
                else:
                    print(f"   📊 总记录数: 0")
                    
            except Exception as e:
                print(f"   ❌ 检查 {db_name} 详细信息失败: {e}")
            
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ 检查数据库状态失败: {e}")
        return False

def main():
    """主函数"""
    print("🔍 数据库状态检查工具")
    print("=" * 50)
    
    # 连接数据库
    print("1. 连接数据库...")
    conn = get_connection()
    if not conn:
        return False
    print("✅ 数据库连接成功")
    
    # 检查数据库状态
    print("\n2. 检查数据库状态...")
    if not check_database_status(conn):
        return False
    
    # 关闭连接
    conn.close()
    
    print("✅ 数据库状态检查完成")
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  操作被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 发生未预期的错误: {e}")
        sys.exit(1)
