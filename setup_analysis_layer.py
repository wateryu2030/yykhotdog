#!/usr/bin/env python3
"""
设置分析层 - 执行ETL分析层的DDL脚本
"""
import os
import sys
import pyodbc
from pathlib import Path

# 添加lib路径
sys.path.append(str(Path(__file__).parent / "etl"))
from lib.mssql import get_conn, execute_sql

def setup_analysis_layer():
    """设置分析层对象"""
    print("🚀 开始设置ETL分析层...")
    
    # 读取DDL文件
    ddl_file = Path(__file__).parent / "etl" / "ddl" / "create_analysis_objects.sql"
    if not ddl_file.exists():
        print(f"❌ DDL文件不存在: {ddl_file}")
        return False
    
    try:
        with open(ddl_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # 分割SQL语句（按GO分割）
        sql_statements = [stmt.strip() for stmt in sql_content.split('GO') if stmt.strip()]
        
        print(f"📋 找到 {len(sql_statements)} 个SQL语句")
        
        # 执行每个SQL语句
        success_count = 0
        for i, sql in enumerate(sql_statements, 1):
            if not sql.strip():
                continue
                
            print(f"执行SQL语句 {i}/{len(sql_statements)}...")
            try:
                if execute_sql("hotdog2030", sql):
                    success_count += 1
                    print(f"✅ SQL语句 {i} 执行成功")
                else:
                    print(f"❌ SQL语句 {i} 执行失败")
            except Exception as e:
                print(f"❌ SQL语句 {i} 执行异常: {e}")
        
        print(f"🎉 分析层设置完成! 成功执行 {success_count}/{len(sql_statements)} 个SQL语句")
        return success_count == len(sql_statements)
        
    except Exception as e:
        print(f"❌ 设置分析层失败: {e}")
        return False

def main():
    """主函数"""
    print("=" * 50)
    print("ETL分析层设置脚本")
    print("=" * 50)
    
    # 设置环境变量以使用Docker容器
    os.environ['MSSQL_HOST'] = 'localhost'
    os.environ['MSSQL_PORT'] = '1433'
    os.environ['MSSQL_USER'] = 'sa'
    os.environ['MSSQL_PASS'] = 'YourStrong@Passw0rd'
    
    # 检查数据库连接
    try:
        with get_conn("hotdog2030") as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            print("✅ 数据库连接成功")
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return
    
    # 设置分析层
    if setup_analysis_layer():
        print("\n🎊 分析层设置成功!")
        print("现在可以运行ETL分析步骤了:")
        print("python etl/run_etl.py")
    else:
        print("\n❌ 分析层设置失败!")
        print("请检查数据库连接和SQL语句")

if __name__ == "__main__":
    main()
