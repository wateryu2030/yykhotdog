"""
MSSQL数据库连接和操作库
支持多数据库连接、数据提取和写入
"""
import os
import pandas as pd
import pymssql
import logging
from typing import Optional, Dict, Any
from contextlib import contextmanager

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MSSQLConnector:
    """MSSQL数据库连接器"""
    
    def __init__(self, host: str = None, port: str = None, user: str = None, password: str = None):
        self.host = host or os.getenv('MSSQL_HOST', 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com')
        self.port = port or os.getenv('MSSQL_PORT', '1433')
        self.user = user or os.getenv('MSSQL_USER', 'hotdog')
        self.password = password or os.getenv('MSSQL_PASS', 'Zhkj@62102218')
    
    @contextmanager
    def get_conn(self, database: str = None):
        """获取数据库连接（上下文管理器）"""
        conn = None
        try:
            conn = pymssql.connect(
                server=self.host,
                port=int(self.port),
                user=self.user,
                password=self.password,
                database=database,
                as_dict=False
            )
            logger.info(f"✅ 成功连接到数据库: {database}")
            yield conn
        except Exception as e:
            logger.error(f"❌ 数据库连接失败: {database}, 错误: {str(e)}")
            raise
        finally:
            if conn:
                conn.close()
                logger.info(f"🔒 数据库连接已关闭: {database}")

def get_conn(database: str = None):
    """便捷函数：获取数据库连接"""
    connector = MSSQLConnector()
    return connector.get_conn(database)

def fetch_df(sql: str, database: str) -> pd.DataFrame:
    """从数据库提取数据到DataFrame"""
    try:
        with get_conn(database) as conn:
            logger.info(f"📊 执行查询: {database}")
            df = pd.read_sql(sql, conn)
            logger.info(f"✅ 成功提取 {len(df)} 行数据")
            return df
    except Exception as e:
        logger.error(f"❌ 数据提取失败: {str(e)}")
        return pd.DataFrame()

def to_sql(df: pd.DataFrame, table: str, database: str, if_exists: str = 'append') -> bool:
    """将DataFrame写入数据库"""
    if df.empty:
        logger.warning("⚠️ DataFrame为空，跳过写入")
        return False
    
    try:
        with get_conn(database) as conn:
            cursor = conn.cursor()
            
            # 构建插入语句 - pymssql使用%s占位符
            cols = ",".join([f"[{col}]" for col in df.columns])
            placeholders = ",".join(["%s"] * len(df.columns))
            insert_sql = f"INSERT INTO [{table}] ({cols}) VALUES ({placeholders})"
            
            # 批量插入
            rows_inserted = 0
            for _, row in df.iterrows():
                try:
                    cursor.execute(insert_sql, tuple(row))
                    rows_inserted += 1
                except Exception as e:
                    logger.warning(f"⚠️ 跳过行插入: {str(e)}")
                    continue
            
            conn.commit()
            logger.info(f"✅ 成功插入 {rows_inserted} 行数据到 {database}.{table}")
            return True
            
    except Exception as e:
        logger.error(f"❌ 数据写入失败: {str(e)}")
        return False

def execute_sql(sql: str, database: str) -> bool:
    """执行SQL语句"""
    try:
        with get_conn(database) as conn:
            cursor = conn.cursor()
            cursor.execute(sql)
            conn.commit()
            logger.info(f"✅ SQL执行成功: {database}")
            return True
    except Exception as e:
        logger.error(f"❌ SQL执行失败: {str(e)}")
        return False

def get_table_info(database: str, table: str) -> pd.DataFrame:
    """获取表结构信息"""
    sql = f"""
    SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = '{table}'
    ORDER BY ORDINAL_POSITION
    """
    return fetch_df(sql, database)

def get_table_count(database: str, table: str) -> int:
    """获取表记录数"""
    sql = f"SELECT COUNT(*) as count FROM [{table}]"
    df = fetch_df(sql, database)
    return df['count'].iloc[0] if not df.empty else 0
