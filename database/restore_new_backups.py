#!/usr/bin/env python3
"""
数据库恢复脚本 - 新备份文件版本
用于将新的备份文件恢复到RDS数据库
- cyrg20251117.bak → cyrg2025
- zhkj20251117.bak → cyrgweixin
"""

import pyodbc
import os
import sys
from pathlib import Path

# RDS数据库连接配置
RDS_CONFIG = {
    'server': 'rm-uf660d00xovkm3067.sqlserver.rds.aliyuncs.com',
    'port': '1433',
    'database': 'master',  # 连接到master数据库进行恢复操作
    'username': 'hotdog',
    'password': 'Zhkj@62102218'
}

def get_connection():
    """获取RDS数据库连接"""
    try:
        # 尝试多个驱动
        drivers_to_try = [
            "ODBC Driver 18 for SQL Server",
            "ODBC Driver 17 for SQL Server",
            "ODBC Driver 13 for SQL Server",
            "FreeTDS"
        ]
        
        connection_string = None
        for driver in drivers_to_try:
            try:
                test_conn_str = (
                    f"DRIVER={{{driver}}};"
                    f"SERVER={RDS_CONFIG['server']},{RDS_CONFIG['port']};"
                    f"DATABASE={RDS_CONFIG['database']};"
                    f"UID={RDS_CONFIG['username']};"
                    f"PWD={RDS_CONFIG['password']};"
                    f"TrustServerCertificate=yes;"
                )
                # 测试连接
                test_conn = pyodbc.connect(test_conn_str, timeout=5)
                test_conn.close()
                connection_string = test_conn_str
                print(f"✅ 使用驱动: {driver}")
                break
            except:
                continue
        
        if not connection_string:
            raise Exception("无法找到可用的ODBC驱动")
        print(f"连接RDS数据库...")
        return pyodbc.connect(connection_string)
    except Exception as e:
        print(f"RDS数据库连接失败: {e}")
        return None

def check_backup_file_info(connection, backup_file):
    """检查备份文件信息，返回逻辑名称"""
    try:
        cursor = connection.cursor()
        
        # 使用RESTORE FILELISTONLY获取备份文件信息
        sql = f"RESTORE FILELISTONLY FROM DISK = '{backup_file}'"
        cursor.execute(sql)
        results = cursor.fetchall()
        
        print(f"\n备份文件 {backup_file} 信息:")
        print("-" * 50)
        logical_names = []
        for row in results:
            logical_name = row[0]
            physical_name = row[1]
            file_type = row[2]
            size_mb = row[3]
            print(f"逻辑名称: {logical_name}")
            print(f"物理名称: {physical_name}")
            print(f"类型: {file_type}")
            print(f"大小: {size_mb} MB")
            print("-" * 50)
            if file_type == 'D':  # 数据文件
                logical_names.append(logical_name)
        
        return logical_names[0] if logical_names else None
    except Exception as e:
        print(f"检查备份文件信息失败: {e}")
        return None

def restore_database(connection, db_name, backup_file, logical_name):
    """恢复数据库到RDS"""
    try:
        cursor = connection.cursor()
        
        # 检查备份文件是否存在
        if not os.path.exists(backup_file):
            print(f"❌ 备份文件不存在: {backup_file}")
            return False
        
        print(f"\n开始恢复数据库: {db_name}")
        print(f"备份文件: {backup_file}")
        print(f"逻辑名称: {logical_name}")
        
        # 删除现有数据库（如果存在）
        drop_sql = f"""
        IF EXISTS (SELECT name FROM sys.databases WHERE name = '{db_name}')
        BEGIN
            ALTER DATABASE [{db_name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
            DROP DATABASE [{db_name}];
        END
        """
        
        print("删除现有数据库...")
        cursor.execute(drop_sql)
        connection.commit()
        print("✅ 现有数据库已删除")
        
        # 恢复数据库 - 使用RDS的默认数据路径
        restore_sql = f"""
        RESTORE DATABASE [{db_name}] 
        FROM DISK = '{backup_file}'
        WITH 
            MOVE '{logical_name}' TO '/var/opt/mssql/data/{db_name}.mdf',
            MOVE '{logical_name}_log' TO '/var/opt/mssql/data/{db_name}_log.ldf',
            REPLACE;
        """
        
        print("执行数据库恢复...")
        cursor.execute(restore_sql)
        connection.commit()
        
        print(f"✅ 数据库 {db_name} 恢复成功！")
        return True
        
    except Exception as e:
        print(f"❌ 恢复数据库 {db_name} 失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def verify_databases(connection):
    """验证数据库恢复结果"""
    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT name, database_id, create_date 
            FROM sys.databases 
            WHERE name IN ('cyrg2025', 'cyrgweixin')
            ORDER BY name;
        """)
        
        results = cursor.fetchall()
        print("\n数据库恢复验证结果:")
        print("-" * 50)
        for row in results:
            print(f"数据库名称: {row[0]}")
            print(f"数据库ID: {row[1]}")
            print(f"创建日期: {row[2]}")
            print("-" * 50)
        
        return len(results) >= 2
        
    except Exception as e:
        print(f"验证数据库失败: {e}")
        return False

def main():
    """主函数"""
    print("=" * 60)
    print("开始数据库恢复操作到RDS...")
    print("=" * 60)
    
    # 获取当前脚本目录
    script_dir = Path(__file__).parent
    backup_dir = script_dir
    
    # 备份文件路径 - 使用新的备份文件
    cyrg_backup = backup_dir / "cyrg20251117.bak"
    zhkj_backup = backup_dir / "zhkj20251117.bak"
    
    print(f"\n备份文件:")
    print(f"  cyrg备份: {cyrg_backup}")
    print(f"  zhkj备份: {zhkj_backup}")
    
    # 检查备份文件是否存在
    if not cyrg_backup.exists():
        print(f"❌ cyrg备份文件不存在: {cyrg_backup}")
        sys.exit(1)
    
    if not zhkj_backup.exists():
        print(f"❌ zhkj备份文件不存在: {zhkj_backup}")
        sys.exit(1)
    
    # 连接RDS数据库
    connection = get_connection()
    if not connection:
        print("❌ 无法连接到RDS数据库，退出程序")
        sys.exit(1)
    
    try:
        # 检查备份文件信息并获取逻辑名称
        print("\n" + "=" * 60)
        print("1. 检查备份文件信息")
        print("=" * 60)
        
        cyrg_logical_name = check_backup_file_info(connection, str(cyrg_backup))
        if not cyrg_logical_name:
            print("❌ 无法获取cyrg备份文件的逻辑名称")
            sys.exit(1)
        
        zhkj_logical_name = check_backup_file_info(connection, str(zhkj_backup))
        if not zhkj_logical_name:
            print("❌ 无法获取zhkj备份文件的逻辑名称")
            sys.exit(1)
        
        # 恢复 cyrg2025 数据库
        print("\n" + "=" * 60)
        print("2. 恢复 cyrg2025 数据库")
        print("=" * 60)
        success1 = restore_database(connection, 'cyrg2025', str(cyrg_backup), cyrg_logical_name)
        
        # 恢复 cyrgweixin 数据库 (使用zhkj备份)
        print("\n" + "=" * 60)
        print("3. 恢复 cyrgweixin 数据库")
        print("=" * 60)
        success2 = restore_database(connection, 'cyrgweixin', str(zhkj_backup), zhkj_logical_name)
        
        # 验证恢复结果
        print("\n" + "=" * 60)
        print("4. 验证数据库恢复结果")
        print("=" * 60)
        verify_success = verify_databases(connection)
        
        # 总结
        print("\n" + "=" * 60)
        print("恢复操作总结:")
        print("=" * 60)
        print(f"cyrg2025 数据库恢复: {'✅ 成功' if success1 else '❌ 失败'}")
        print(f"cyrgweixin 数据库恢复: {'✅ 成功' if success2 else '❌ 失败'}")
        print(f"数据库验证: {'✅ 成功' if verify_success else '❌ 失败'}")
        
        if success1 and success2 and verify_success:
            print("\n✅ 所有数据库恢复操作完成！")
            print("\n下一步: 需要将数据同步到hotdog2030数据库")
        else:
            print("\n❌ 部分数据库恢复操作失败，请检查错误信息")
            
    except Exception as e:
        print(f"\n❌ 恢复过程中发生错误: {e}")
        import traceback
        traceback.print_exc()
    finally:
        connection.close()
        print("\nRDS数据库连接已关闭")

if __name__ == "__main__":
    main()

