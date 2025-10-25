import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 检查是否使用SQLite
const useSQLite = process.env.USE_SQLITE === 'true';

console.log('数据库配置检查:');
console.log('USE_SQLITE:', useSQLite);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USERNAME:', process.env.DB_USERNAME);
console.log('CARGO_DB_HOST:', process.env.CARGO_DB_HOST);

let sequelize: Sequelize;
let cyrg2025Sequelize: Sequelize;

if (useSQLite) {
  // 使用SQLite配置
  const sqlitePath = process.env.SQLITE_PATH || './database/dev.sqlite';
  
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqlitePath,
    logging: process.env.LOG_LEVEL === 'debug' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });

  cyrg2025Sequelize = sequelize; // SQLite模式下使用同一个连接
} else {
  // 使用MSSQL配置
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    username: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hotdog2030',
    dialect: 'mssql' as const,
    logging: process.env.LOG_LEVEL === 'debug' ? console.log : false,
    dialectOptions: {
      encrypt: false,
      trustServerCertificate: true
    },
    timezone: '+08:00',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    retry: {
      max: 3
    }
  };

  const cyrg2025DbConfig = {
    host: process.env.CARGO_DB_HOST || 'localhost',
    port: parseInt(process.env.CARGO_DB_PORT || '1433'),
    username: process.env.CARGO_DB_USER || 'sa',
    password: process.env.CARGO_DB_PASSWORD || '',
    database: process.env.CARGO_DB_NAME || 'cyrg2025',
    dialect: 'mssql' as const,
    logging: process.env.LOG_LEVEL === 'debug' ? console.log : false,
    dialectOptions: {
      encrypt: false,
      trustServerCertificate: true
    },
    timezone: '+08:00',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    retry: {
      max: 3
    }
  };

  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      dialect: dbConfig.dialect,
      logging: dbConfig.logging,
      dialectOptions: dbConfig.dialectOptions,
      timezone: dbConfig.timezone,
      pool: dbConfig.pool,
      retry: dbConfig.retry
    }
  );

  cyrg2025Sequelize = new Sequelize(
    cyrg2025DbConfig.database,
    cyrg2025DbConfig.username,
    cyrg2025DbConfig.password,
    {
      host: cyrg2025DbConfig.host,
      port: cyrg2025DbConfig.port,
      database: cyrg2025DbConfig.database,
      dialect: cyrg2025DbConfig.dialect,
      logging: cyrg2025DbConfig.logging,
      dialectOptions: cyrg2025DbConfig.dialectOptions,
      timezone: cyrg2025DbConfig.timezone,
      pool: cyrg2025DbConfig.pool,
      retry: cyrg2025DbConfig.retry
    }
  );
}

export { sequelize, cyrg2025Sequelize };

// 数据库连接函数
export async function connectDatabase() {
  try {
    if (useSQLite) {
      logger.info('使用SQLite数据库模式');
      await sequelize.authenticate();
      logger.info('SQLite数据库连接成功');
    } else {
      logger.info('使用MSSQL数据库模式');
      await sequelize.authenticate();
      logger.info('主数据库连接成功');
      
      await cyrg2025Sequelize.authenticate();
      logger.info('货物数据库连接成功');
    }
  } catch (error) {
    logger.error('数据库连接失败:', error);
    throw error;
  }
}
