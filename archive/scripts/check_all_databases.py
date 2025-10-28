#!/usr/bin/env python3
"""
检查RDS上所有数据库的状态
包括cyrg2025, cyrgweixin, hotdog2030
"""

import pymssql

def check_all_databases():
    """检查所有数据库状态"""
    print("🔍 检查RDS上所有数据库状态...")
    print("=" * 60)
    
    try:
        # 连接到master数据库
        conn = pymssql.connect(
            server='rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com',
            port=1433,
            user='hotdog',
            password='Zhkj@62102218',
            database='master'
        )
        cursor = conn.cursor()
        
        print("✅ 数据库连接成功!")
        
        # 获取所有数据库列表
        cursor.execute('SELECT name FROM sys.databases ORDER BY name')
        all_databases = cursor.fetchall()
        print(f"\n📊 RDS上的所有数据库:")
        for db in all_databases:
            print(f"  - {db[0]}")
        
        # 检查目标数据库
        target_dbs = ['cyrg2025', 'cyrgweixin', 'hotdog2030']
        print(f"\n🎯 检查目标数据库:")
        
        total_tables = 0
        total_records = 0
        
        for db_name in target_dbs:
            if any(db[0] == db_name for db in all_databases):
                print(f"\n✅ {db_name} 数据库存在")
                
                try:
                    cursor.execute(f'USE [{db_name}]')
                    
                    # 获取表数量
                    cursor.execute('SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = \'BASE TABLE\'')
                    table_count = cursor.fetchone()[0]
                    total_tables += table_count
                    print(f"  📋 {db_name} 有 {table_count} 个表")
                    
                    # 检查前几个表的数据量
                    if table_count > 0:
                        cursor.execute('SELECT TOP 5 TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = \'BASE TABLE\'')
                        tables = cursor.fetchall()
                        db_records = 0
                        
                        for table in tables:
                            table_name = table[0]
                            try:
                                cursor.execute(f'SELECT COUNT(*) FROM [{table_name}]')
                                count = cursor.fetchone()[0]
                                db_records += count
                                print(f"    - {table_name}: {count:,} 条记录")
                            except Exception as e:
                                print(f"    - {table_name}: 查询失败")
                        
                        total_records += db_records
                        print(f"  📊 {db_name} 总记录数: {db_records:,}")
                        
                        if db_records == 0:
                            print(f"  ❌ {db_name} 数据库为空，需要恢复数据")
                        else:
                            print(f"  ✅ {db_name} 数据库有数据")
                    else:
                        print(f"  ❌ {db_name} 没有表")
                        
                except Exception as e:
                    print(f"  ❌ 检查 {db_name} 失败: {e}")
            else:
                print(f"\n❌ {db_name} 数据库不存在")
        
        # 总结
        print(f"\n📊 数据库状态总结:")
        print(f"  - 目标数据库: {len(target_dbs)} 个")
        print(f"  - 总表数: {total_tables:,} 个")
        print(f"  - 总记录数: {total_records:,} 条")
        
        if total_records == 0:
            print(f"\n❌ 所有数据库都是空的，需要恢复数据")
            print(f"📁 备份文件位置:")
            print(f"  - cyrg2025-10-24.bak (317MB) → cyrg2025数据库")
            print(f"  - zhkj2025-10-24.bak (171MB) → cyrgweixin数据库")
        else:
            print(f"\n✅ 数据库恢复完成！")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return False

def main():
    """主函数"""
    print("🚀 RDS数据库状态检查工具")
    print("=" * 60)
    
    if check_all_databases():
        print("\n🎉 数据库检查完成!")
    else:
        print("\n❌ 数据库检查失败!")

if __name__ == "__main__":
    main()
