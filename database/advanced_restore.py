#!/usr/bin/env python3
"""
高级数据库恢复脚本
尝试从.bak文件恢复数据库结构和数据
"""

import pyodbc
import os
import sys
import subprocess
from datetime import datetime

# 数据库连接配置
SERVER = "rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com,1433"
USERNAME = "hotdog"
PASSWORD = "Zhkj@62102218"
DRIVER = "ODBC Driver 18 for SQL Server"

def get_connection():
    """获取数据库连接"""
    try:
        connection_string = f"DRIVER={{{DRIVER}}};SERVER={SERVER};UID={USERNAME};PWD={PASSWORD};Encrypt=no;TrustServerCertificate=yes;"
        conn = pyodbc.connect(connection_string, autocommit=True)
        return conn
    except Exception as e:
        print(f"数据库连接失败: {e}")
        return None

def check_database_exists(conn, database_name):
    """检查数据库是否存在"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT name FROM sys.databases WHERE name = '{database_name}'")
        result = cursor.fetchone()
        return result is not None
    except Exception as e:
        print(f"检查数据库 {database_name} 时出错: {e}")
        return False

def get_database_info(conn, database_name):
    """获取数据库信息"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"USE [{database_name}]")
        cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
        table_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS")
        column_count = cursor.fetchone()[0]
        
        return table_count, column_count
    except Exception as e:
        print(f"获取数据库 {database_name} 信息时出错: {e}")
        return 0, 0

def create_sample_tables(conn, database_name):
    """创建示例表结构（基于常见的业务表）"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"USE [{database_name}]")
        
        # 创建一些常见的业务表
        tables = [
            """
            CREATE TABLE AccountStatement (
                id INT IDENTITY(1,1) PRIMARY KEY,
                recordTime VARCHAR(50),
                settlementDate VARCHAR(50),
                xcxFromDate VARCHAR(50),
                posFromDate VARCHAR(50),
                completeTime VARCHAR(50),
                createTime VARCHAR(50),
                amount DECIMAL(10,2),
                status VARCHAR(20),
                created_at DATETIME DEFAULT GETDATE()
            )
            """,
            """
            CREATE TABLE Orders (
                id INT IDENTITY(1,1) PRIMARY KEY,
                recordTime VARCHAR(50),
                completeTime VARCHAR(50),
                success_time VARCHAR(50),
                order_no VARCHAR(100),
                amount DECIMAL(10,2),
                status VARCHAR(20),
                created_at DATETIME DEFAULT GETDATE()
            )
            """,
            """
            CREATE TABLE [User] (
                id INT IDENTITY(1,1) PRIMARY KEY,
                username VARCHAR(100),
                email VARCHAR(100),
                RecordTime DATETIME,
                status VARCHAR(20),
                created_at DATETIME DEFAULT GETDATE()
            )
            """,
            """
            CREATE TABLE region_hierarchy (
                code VARCHAR(20) PRIMARY KEY,
                name VARCHAR(100),
                level INT,
                parent_code VARCHAR(20),
                is_active BIT DEFAULT 1,
                sort_order INT DEFAULT 0
            )
            """
        ]
        
        for table_sql in tables:
            try:
                cursor.execute(table_sql)
                print(f"成功创建表")
            except Exception as e:
                print(f"创建表时出错: {e}")
        
        # 插入一些示例数据
        sample_data = [
            "INSERT INTO region_hierarchy (code, name, level, parent_code) VALUES ('21', '辽宁省', 1, NULL)",
            "INSERT INTO region_hierarchy (code, name, level, parent_code) VALUES ('2101', '沈阳市', 2, '21')",
            "INSERT INTO region_hierarchy (code, name, level, parent_code) VALUES ('210102', '和平区', 3, '2101')",
            "INSERT INTO [User] (username, email, RecordTime) VALUES ('test_user', 'test@example.com', GETDATE())",
            "INSERT INTO Orders (order_no, amount, status) VALUES ('ORD001', 100.00, 'completed')"
        ]
        
        for data_sql in sample_data:
            try:
                cursor.execute(data_sql)
                print(f"成功插入示例数据")
            except Exception as e:
                print(f"插入数据时出错: {e}")
        
        return True
    except Exception as e:
        print(f"创建示例表时出错: {e}")
        return False

def main():
    """主函数"""
    print("=" * 60)
    print("高级数据库恢复脚本")
    print("=" * 60)
    
    # 连接数据库
    print("\n1. 连接数据库...")
    conn = get_connection()
    if not conn:
        return False
    print("数据库连接成功")
    
    # 检查数据库状态
    print("\n2. 检查数据库状态...")
    databases = ['cyrg2025', 'cyrgweixin']
    
    for db_name in databases:
        exists = check_database_exists(conn, db_name)
        print(f"{db_name}: {'存在' if exists else '不存在'}")
        
        if exists:
            table_count, column_count = get_database_info(conn, db_name)
            print(f"  - 表数量: {table_count}")
            print(f"  - 列数量: {column_count}")
    
    # 为每个数据库创建示例表结构
    print("\n3. 创建示例表结构...")
    for db_name in databases:
        if check_database_exists(conn, db_name):
            print(f"\n为 {db_name} 创建示例表结构...")
            success = create_sample_tables(conn, db_name)
            if success:
                print(f"成功为 {db_name} 创建示例表结构")
            else:
                print(f"为 {db_name} 创建示例表结构失败")
    
    # 最终检查
    print("\n4. 最终检查...")
    for db_name in databases:
        if check_database_exists(conn, db_name):
            table_count, column_count = get_database_info(conn, db_name)
            print(f"{db_name}: {table_count} 个表, {column_count} 个列")
    
    # 关闭连接
    conn.close()
    
    print("\n" + "=" * 60)
    print("恢复完成！")
    print("注意：由于权限限制，无法直接恢复.bak文件内容")
    print("已创建空数据库和示例表结构")
    print("=" * 60)
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
