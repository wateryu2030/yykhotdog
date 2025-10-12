import { Router, Request, Response } from 'express';
import { Sequelize, QueryTypes } from 'sequelize';

const router = Router();

// cyrgweixin数据库配置
const cyrgweixinDbConfig = {
  host: process.env['CARGO_DB_HOST'] || 'localhost',
  port: parseInt(process.env['CARGO_DB_PORT'] || '1433'),
  username: process.env['CARGO_DB_USER'] || 'sa',
  password: process.env['CARGO_DB_PASSWORD'] || 'your_local_password_here',
  database: 'cyrgweixin',
  dialect: 'mssql' as any,
  logging: (msg: string) => console.log(msg),
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  },
  timezone: '+08:00',
  pool: {
    max: 5,
    min: 0,
    acquire: 60000,
    idle: 10000
  },
  retry: {
    max: 3,
    timeout: 60000
  }
};

// 创建cyrgweixin数据库连接
const cyrgweixinSequelize = new Sequelize(
  cyrgweixinDbConfig.database,
  cyrgweixinDbConfig.username,
  cyrgweixinDbConfig.password,
  {
    host: cyrgweixinDbConfig.host,
    port: cyrgweixinDbConfig.port,
    database: cyrgweixinDbConfig.database,
    dialect: cyrgweixinDbConfig.dialect,
    logging: cyrgweixinDbConfig.logging,
    dialectOptions: cyrgweixinDbConfig.dialectOptions,
    timezone: cyrgweixinDbConfig.timezone,
    pool: cyrgweixinDbConfig.pool
  }
);

// 检查cyrg2025数据库中的表和数据
router.get('/cyrg2025', async (req: Request, res: Response) => {
  try {
    const { cyrg2025Sequelize } = await import('../config/database');
    
    // 获取所有表名
    const tables = await cyrg2025Sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `, { type: QueryTypes.SELECT });

    // 检查每个表的数据量和最新数据
    const tableInfo = [];
    for (const table of tables) {
      const tableName = (table as any).TABLE_NAME;
      
      // 获取表记录数
      const countResult = await cyrg2025Sequelize.query(`
        SELECT COUNT(*) as count FROM [${tableName}]
      `, { type: QueryTypes.SELECT });
      
      const count = (countResult[0] as any).count;
      
      // 查找包含日期的列
      const dateColumns = await cyrg2025Sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${tableName}' 
        AND (DATA_TYPE LIKE '%date%' OR DATA_TYPE LIKE '%time%' OR COLUMN_NAME LIKE '%date%' OR COLUMN_NAME LIKE '%time%')
      `, { type: QueryTypes.SELECT });
      
      let latestData = null;
      if (dateColumns.length > 0) {
        const dateColumn = (dateColumns[0] as any).COLUMN_NAME;
        const latestResult = await cyrg2025Sequelize.query(`
          SELECT TOP 1 * FROM [${tableName}] 
          ORDER BY [${dateColumn}] DESC
        `, { type: QueryTypes.SELECT });
        
        if (latestResult.length > 0) {
          latestData = latestResult[0];
        }
      }
      
      tableInfo.push({
        tableName,
        count,
        dateColumns: dateColumns.map((col: any) => col.COLUMN_NAME),
        latestData
      });
    }
    
    res.json({
      success: true,
      database: 'cyrg2025',
      tables: tableInfo
    });
  } catch (error) {
    console.error('检查cyrg2025数据库失败:', error);
    res.status(500).json({
      success: false,
      error: '检查cyrg2025数据库失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 检查cyrgweixin数据库中的表和数据
router.get('/cyrgweixin', async (req: Request, res: Response) => {
  try {
    // 测试连接
    await cyrgweixinSequelize.authenticate();
    
    // 获取所有表名
    const tables = await cyrgweixinSequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `, { type: QueryTypes.SELECT });

    // 检查每个表的数据量和最新数据
    const tableInfo = [];
    for (const table of tables) {
      const tableName = (table as any).TABLE_NAME;
      
      // 获取表记录数
      const countResult = await cyrgweixinSequelize.query(`
        SELECT COUNT(*) as count FROM [${tableName}]
      `, { type: QueryTypes.SELECT });
      
      const count = (countResult[0] as any).count;
      
      // 查找包含日期的列
      const dateColumns = await cyrgweixinSequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${tableName}' 
        AND (DATA_TYPE LIKE '%date%' OR DATA_TYPE LIKE '%time%' OR COLUMN_NAME LIKE '%date%' OR COLUMN_NAME LIKE '%time%')
      `, { type: QueryTypes.SELECT });
      
      let latestData = null;
      if (dateColumns.length > 0) {
        const dateColumn = (dateColumns[0] as any).COLUMN_NAME;
        const latestResult = await cyrgweixinSequelize.query(`
          SELECT TOP 1 * FROM [${tableName}] 
          ORDER BY [${dateColumn}] DESC
        `, { type: QueryTypes.SELECT });
        
        if (latestResult.length > 0) {
          latestData = latestResult[0];
        }
      }
      
      tableInfo.push({
        tableName,
        count,
        dateColumns: dateColumns.map((col: any) => col.COLUMN_NAME),
        latestData
      });
    }
    
    res.json({
      success: true,
      database: 'cyrgweixin',
      tables: tableInfo
    });
  } catch (error) {
    console.error('检查cyrgweixin数据库失败:', error);
    res.status(500).json({
      success: false,
      error: '检查cyrgweixin数据库失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
