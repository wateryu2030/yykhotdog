#!/usr/bin/env python3
"""
简单数据库恢复脚本
直接使用RESTORE命令恢复数据库
"""

import pymssql

def execute_restore():
    """执行数据库恢复"""
    print("🚀 开始数据库恢复...")
    print("=" * 60)
    
    try:
        # 连接到RDS
        conn = pymssql.connect(
            server='rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com',
            port=1433,
            user='hotdog',
            password='Zhkj@62102218',
            database='master'
        )
        cursor = conn.cursor()
        
        print("✅ 数据库连接成功")
        
        # 恢复cyrg2025数据库
        print("\n🔄 恢复cyrg2025数据库...")
        try:
            cursor.execute("""
            RESTORE DATABASE [cyrg2025] 
            FROM DISK = '/Users/apple/Ahope/yykhotdog/database/cyrg2025-10-24.bak'
            WITH REPLACE
            """)
            print("✅ cyrg2025数据库恢复成功")
        except Exception as e:
            print(f"❌ cyrg2025数据库恢复失败: {e}")
            return False
        
        # 恢复cyrgweixin数据库
        print("\n🔄 恢复cyrgweixin数据库...")
        try:
            cursor.execute("""
            RESTORE DATABASE [cyrgweixin] 
            FROM DISK = '/Users/apple/Ahope/yykhotdog/database/zhkj2025-10-24.bak'
            WITH REPLACE
            """)
            print("✅ cyrgweixin数据库恢复成功")
        except Exception as e:
            print(f"❌ cyrgweixin数据库恢复失败: {e}")
            return False
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 数据库恢复失败: {e}")
        return False

def verify_restore():
    """验证恢复结果"""
    print("\n🔍 验证恢复结果...")
    
    try:
        conn = pymssql.connect(
            server='rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com',
            port=1433,
            user='hotdog',
            password='Zhkj@62102218',
            database='master'
        )
        cursor = conn.cursor()
        
        target_dbs = ['cyrg2025', 'cyrgweixin']
        success_count = 0
        
        for db_name in target_dbs:
            try:
                cursor.execute(f'USE [{db_name}]')
                
                # 检查表数量
                cursor.execute('SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = \'BASE TABLE\'')
                table_count = cursor.fetchone()[0]
                
                # 检查数据量
                cursor.execute('SELECT TOP 1 TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = \'BASE TABLE\'')
                first_table = cursor.fetchone()
                if first_table:
                    cursor.execute(f'SELECT COUNT(*) FROM [{first_table[0]}]')
                    record_count = cursor.fetchone()[0]
                    print(f"✅ {db_name}: {table_count} 个表, 示例表 {first_table[0]}: {record_count:,} 条记录")
                    
                    if record_count > 0:
                        success_count += 1
                    else:
                        print(f"⚠️ {db_name} 数据库仍然为空")
                else:
                    print(f"❌ {db_name} 没有表")
                    
            except Exception as e:
                print(f"❌ 检查 {db_name} 失败: {e}")
        
        conn.close()
        
        if success_count == len(target_dbs):
            print("\n🎉 所有数据库恢复成功！")
            return True
        else:
            print(f"\n⚠️ 部分数据库恢复失败 ({success_count}/{len(target_dbs)})")
            return False
            
    except Exception as e:
        print(f"❌ 验证恢复结果失败: {e}")
        return False

def main():
    """主函数"""
    print("🚀 简单数据库恢复工具")
    print("=" * 60)
    
    # 执行恢复
    if execute_restore():
        # 验证结果
        if verify_restore():
            print("\n🎉 数据库恢复完成！")
            print("✅ cyrg2025数据库已恢复")
            print("✅ cyrgweixin数据库已恢复")
            return True
        else:
            print("\n⚠️ 数据库恢复可能不完整")
            return False
    else:
        print("\n❌ 数据库恢复失败")
        return False

if __name__ == "__main__":
    main()
