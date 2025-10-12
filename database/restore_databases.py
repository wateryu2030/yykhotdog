#!/usr/bin/env python3
"""
数据库恢复脚本
用于从备份文件恢复 cyrg2025 和 cyrgweixin 数据库
"""

import pyodbc
import os
import sys
from pathlib import Path

# 数据库连接配置
DB_CONFIG = {
    'server': 'rm-2ze8w8j3h8x8k8h5o.mssql.rds.aliyuncs.com',
    'port': '1433',
    'database': 'master',  # 连接到master数据库进行恢复操作
    'username': 'cyrg2025',
    'password': 'Cyrg2025!@#'
}

def get_connection():
    """获取数据库连接"""
    try:
        connection_string = (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={DB_CONFIG['server']},{DB_CONFIG['port']};"
            f"DATABASE={DB_CONFIG['database']};"
            f"UID={DB_CONFIG['username']};"
            f"PWD={DB_CONFIG['password']};"
            f"TrustServerCertificate=yes;"
        )
        return pyodbc.connect(connection_string)
    except Exception as e:
        print(f"数据库连接失败: {e}")
        return None

def restore_database(connection, db_name, backup_file, logical_name):
    """恢复数据库"""
    try:
        cursor = connection.cursor()
        
        # 检查备份文件是否存在
        if not os.path.exists(backup_file):
            print(f"备份文件不存在: {backup_file}")
            return False
        
        print(f"开始恢复数据库: {db_name}")
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
        
        # 恢复数据库
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
        
        print(f"数据库 {db_name} 恢复成功！")
        return True
        
    except Exception as e:
        print(f"恢复数据库 {db_name} 失败: {e}")
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
        
        return len(results) == 2
        
    except Exception as e:
        print(f"验证数据库失败: {e}")
        return False

def main():
    """主函数"""
    print("开始数据库恢复操作...")
    print("=" * 60)
    
    # 获取当前脚本目录
    script_dir = Path(__file__).parent
    backup_dir = script_dir
    
    # 备份文件路径
    cyrg_backup = backup_dir / "cyrg_backup_2025_09_09_000004_9004235.bak"
    zhkj_backup = backup_dir / "zhkj_backup_2025_09_09_000002_6761311.bak"
    
    # 连接数据库
    connection = get_connection()
    if not connection:
        print("无法连接到数据库，退出程序")
        sys.exit(1)
    
    try:
        # 恢复 cyrg2025 数据库
        print("\n1. 恢复 cyrg2025 数据库")
        print("-" * 40)
        success1 = restore_database(connection, 'cyrg2025', str(cyrg_backup), 'cyrg')
        
        # 恢复 cyrgweixin 数据库
        print("\n2. 恢复 cyrgweixin 数据库")
        print("-" * 40)
        success2 = restore_database(connection, 'cyrgweixin', str(zhkj_backup), 'zhkj')
        
        # 验证恢复结果
        print("\n3. 验证数据库恢复结果")
        print("-" * 40)
        verify_success = verify_databases(connection)
        
        # 总结
        print("\n恢复操作总结:")
        print("=" * 60)
        print(f"cyrg2025 数据库恢复: {'成功' if success1 else '失败'}")
        print(f"cyrgweixin 数据库恢复: {'成功' if success2 else '失败'}")
        print(f"数据库验证: {'成功' if verify_success else '失败'}")
        
        if success1 and success2 and verify_success:
            print("\n✅ 所有数据库恢复操作完成！")
        else:
            print("\n❌ 部分数据库恢复操作失败，请检查错误信息")
            
    except Exception as e:
        print(f"恢复过程中发生错误: {e}")
    finally:
        connection.close()
        print("\n数据库连接已关闭")

if __name__ == "__main__":
    main()
