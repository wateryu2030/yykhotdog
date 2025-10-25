#!/usr/bin/env python3
"""
数据库恢复脚本 - 更新版本
用于将本地备份文件恢复到RDS数据库
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
        connection_string = (
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={RDS_CONFIG['server']},{RDS_CONFIG['port']};"
            f"DATABASE={RDS_CONFIG['database']};"
            f"UID={RDS_CONFIG['username']};"
            f"PWD={RDS_CONFIG['password']};"
            f"TrustServerCertificate=yes;"
        )
        print(f"连接字符串: {connection_string}")
        return pyodbc.connect(connection_string)
    except Exception as e:
        print(f"RDS数据库连接失败: {e}")
        return None

def check_backup_file_info(connection, backup_file):
    """检查备份文件信息"""
    try:
        cursor = connection.cursor()
        
        # 使用RESTORE FILELISTONLY获取备份文件信息
        sql = f"RESTORE FILELISTONLY FROM DISK = '{backup_file}'"
        cursor.execute(sql)
        results = cursor.fetchall()
        
        print(f"备份文件 {backup_file} 信息:")
        print("-" * 50)
        for row in results:
            print(f"逻辑名称: {row[0]}")
            print(f"物理名称: {row[1]}")
            print(f"类型: {row[2]}")
            print(f"大小: {row[3]} MB")
            print("-" * 50)
        
        return results
    except Exception as e:
        print(f"检查备份文件信息失败: {e}")
        return None

def restore_database(connection, db_name, backup_file, logical_name):
    """恢复数据库到RDS"""
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
            WHERE name IN ('cyrg2025', 'hotdog2030')
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
        
        return len(results) >= 1
        
    except Exception as e:
        print(f"验证数据库失败: {e}")
        return False

def main():
    """主函数"""
    print("开始数据库恢复操作到RDS...")
    print("=" * 60)
    
    # 获取当前脚本目录
    script_dir = Path(__file__).parent
    backup_dir = script_dir
    
    # 备份文件路径 - 使用最新的备份文件
    cyrg_backup = backup_dir / "cyrg2025-10-24.bak"
    zhkj_backup = backup_dir / "zhkj2025-10-24.bak"
    
    print(f"cyrg备份文件: {cyrg_backup}")
    print(f"zhkj备份文件: {zhkj_backup}")
    
    # 连接RDS数据库
    connection = get_connection()
    if not connection:
        print("无法连接到RDS数据库，退出程序")
        sys.exit(1)
    
    try:
        # 检查备份文件信息
        print("\n1. 检查备份文件信息")
        print("-" * 40)
        if cyrg_backup.exists():
            check_backup_file_info(connection, str(cyrg_backup))
        
        # 恢复 cyrg2025 数据库
        print("\n2. 恢复 cyrg2025 数据库")
        print("-" * 40)
        success1 = restore_database(connection, 'cyrg2025', str(cyrg_backup), 'cyrg')
        
        # 恢复 hotdog2030 数据库 (使用zhkj备份)
        print("\n3. 恢复 hotdog2030 数据库")
        print("-" * 40)
        success2 = restore_database(connection, 'hotdog2030', str(zhkj_backup), 'zhkj')
        
        # 验证恢复结果
        print("\n4. 验证数据库恢复结果")
        print("-" * 40)
        verify_success = verify_databases(connection)
        
        # 总结
        print("\n恢复操作总结:")
        print("=" * 60)
        print(f"cyrg2025 数据库恢复: {'成功' if success1 else '失败'}")
        print(f"hotdog2030 数据库恢复: {'成功' if success2 else '失败'}")
        print(f"数据库验证: {'成功' if verify_success else '失败'}")
        
        if success1 and success2 and verify_success:
            print("\n✅ 所有数据库恢复操作完成！")
        else:
            print("\n❌ 部分数据库恢复操作失败，请检查错误信息")
            
    except Exception as e:
        print(f"恢复过程中发生错误: {e}")
    finally:
        connection.close()
        print("\nRDS数据库连接已关闭")

if __name__ == "__main__":
    main()
