#!/usr/bin/env python3
"""
导出数据库结构（Schema）脚本
只导出表结构，不包含数据
"""
import pyodbc
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 数据库连接配置
DB_CONFIG = {
    'server': 'localhost',
    'port': 1433,
    'username': 'sa',
    'password': 'YourStrong@Passw0rd',
    'driver': '{ODBC Driver 18 for SQL Server}',
    'timeout': 30
}

def get_connection(database):
    """获取数据库连接"""
    conn_str = (
        f"DRIVER={DB_CONFIG['driver']};"
        f"SERVER={DB_CONFIG['server']},{DB_CONFIG['port']};"
        f"DATABASE={database};"
        f"UID={DB_CONFIG['username']};"
        f"PWD={DB_CONFIG['password']};"
        f"Encrypt=no;"
        f"TrustServerCertificate=yes;"
        f"Connection Timeout={DB_CONFIG['timeout']}"
    )
    try:
        conn = pyodbc.connect(conn_str, autocommit=True)
        logger.info(f"✅ 连接到 {database} 数据库成功")
        return conn
    except Exception as e:
        logger.error(f"❌ 连接 {database} 数据库失败: {e}")
        return None

def export_table_schema(cursor, table_name):
    """导出单个表的结构"""
    try:
        # 获取表的基本信息
        cursor.execute(f"""
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                NUMERIC_PRECISION,
                NUMERIC_SCALE,
                IS_NULLABLE,
                COLUMN_DEFAULT,
                ORDINAL_POSITION
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '{table_name}'
            ORDER BY ORDINAL_POSITION
        """)
        columns = cursor.fetchall()
        
        if not columns:
            return f"-- 表 {table_name} 不存在或没有列\n"
        
        # 获取主键信息
        cursor.execute(f"""
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_NAME = '{table_name}' AND CONSTRAINT_NAME LIKE 'PK_%'
            ORDER BY ORDINAL_POSITION
        """)
        primary_keys = [row[0] for row in cursor.fetchall()]
        
        # 获取外键信息
        cursor.execute(f"""
            SELECT 
                kcu.COLUMN_NAME,
                ccu.TABLE_NAME AS REFERENCED_TABLE_NAME,
                ccu.COLUMN_NAME AS REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
            INNER JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
                ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
            INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
                ON rc.UNIQUE_CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
            WHERE kcu.TABLE_NAME = '{table_name}'
        """)
        foreign_keys = cursor.fetchall()
        
        # 生成CREATE TABLE语句
        schema_sql = f"-- 表: {table_name}\n"
        schema_sql += f"CREATE TABLE [{table_name}] (\n"
        
        column_definitions = []
        for col in columns:
            col_name = col[0]
            data_type = col[1]
            max_length = col[2]
            precision = col[3]
            scale = col[4]
            is_nullable = col[5]
            default_value = col[6]
            
            # 构建数据类型
            if data_type in ['varchar', 'nvarchar', 'char', 'nchar']:
                if max_length == -1:
                    type_def = f"{data_type}(MAX)"
                else:
                    type_def = f"{data_type}({max_length})"
            elif data_type in ['decimal', 'numeric']:
                type_def = f"{data_type}({precision},{scale})"
            else:
                type_def = data_type
            
            # 构建列定义
            col_def = f"    [{col_name}] {type_def}"
            
            # 添加NOT NULL约束
            if is_nullable == 'NO':
                col_def += " NOT NULL"
            
            # 添加默认值
            if default_value:
                col_def += f" DEFAULT {default_value}"
            
            column_definitions.append(col_def)
        
        schema_sql += ",\n".join(column_definitions)
        
        # 添加主键约束
        if primary_keys:
            pk_cols = ", ".join([f"[{pk}]" for pk in primary_keys])
            schema_sql += f",\n    PRIMARY KEY ({pk_cols})"
        
        schema_sql += "\n);\n\n"
        
        # 添加外键约束
        for fk in foreign_keys:
            col_name, ref_table, ref_col = fk
            schema_sql += f"ALTER TABLE [{table_name}] ADD CONSTRAINT FK_{table_name}_{col_name} "
            schema_sql += f"FOREIGN KEY ([{col_name}]) REFERENCES [{ref_table}]([{ref_col}]);\n"
        
        if foreign_keys:
            schema_sql += "\n"
        
        return schema_sql
        
    except Exception as e:
        logger.error(f"❌ 导出表 {table_name} 结构失败: {e}")
        return f"-- 导出表 {table_name} 失败: {e}\n"

def export_database_schema(database_name):
    """导出整个数据库的结构"""
    logger.info(f"🔄 开始导出 {database_name} 数据库结构...")
    
    conn = get_connection(database_name)
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # 获取所有表名
        cursor.execute("""
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        """)
        tables = [row[0] for row in cursor.fetchall()]
        
        logger.info(f"📊 找到 {len(tables)} 个表")
        
        # 生成完整的schema文件
        schema_content = f"-- {database_name} 数据库结构\n"
        schema_content += f"-- 导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        schema_content += f"-- 表数量: {len(tables)}\n\n"
        
        # 导出每个表的结构
        for table_name in tables:
            logger.info(f"📋 导出表: {table_name}")
            table_schema = export_table_schema(cursor, table_name)
            schema_content += table_schema
        
        # 保存到文件
        filename = f"{database_name}_schema.sql"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(schema_content)
        
        logger.info(f"✅ {database_name} 数据库结构已导出到: {filename}")
        return True
        
    except Exception as e:
        logger.error(f"❌ 导出 {database_name} 数据库结构失败: {e}")
        return False
    finally:
        conn.close()

def main():
    """主函数"""
    logger.info("🚀 开始导出数据库结构...")
    
    databases = ['cyrg2025', 'cyrgweixin', 'hotdog2030']
    
    for db_name in databases:
        logger.info(f"📋 处理数据库: {db_name}")
        success = export_database_schema(db_name)
        if success:
            logger.info(f"✅ {db_name} 导出成功")
        else:
            logger.error(f"❌ {db_name} 导出失败")
        logger.info("-" * 50)
    
    logger.info("🎉 数据库结构导出完成！")

if __name__ == "__main__":
    main()
