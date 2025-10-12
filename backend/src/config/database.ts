import { Sequelize } from 'sequelize';

const dbConfig = {
  host: process.env['DB_HOST'] || 'localhost',
  port: parseInt(process.env['DB_PORT'] || '1433'),
  username: process.env['DB_USERNAME'] || 'sa',
  password: process.env['DB_PASSWORD'] || 'YourStrong@Passw0rd',
  database: process.env['DB_NAME'] || 'hotdog2030',
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
    max: 10,
    min: 0,
    acquire: 60000,
    idle: 10000
  },
  retry: {
    max: 3,
    timeout: 60000
  }
};

// cyrg2025数据库配置
const cyrg2025DbConfig = {
  host: process.env['CARGO_DB_HOST'] || 'localhost',
  port: parseInt(process.env['CARGO_DB_PORT'] || '1433'),
  username: process.env['CARGO_DB_USER'] || 'sa',
  password: process.env['CARGO_DB_PASSWORD'] || 'Hotdog123!',
  database: process.env['CARGO_DB_NAME'] || 'cyrg2025',
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

export const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database, // 添加这个参数
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    dialectOptions: dbConfig.dialectOptions,
    timezone: dbConfig.timezone,
    pool: dbConfig.pool
  }
);

// cyrg2025数据库连接
export const cyrg2025Sequelize = new Sequelize(
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
    pool: cyrg2025DbConfig.pool
  }
);

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('主数据库连接成功');
  } catch (error) {
    console.error('主数据库连接失败:', error);
    throw error;
  }
  
  // 尝试连接cyrg2025数据库，失败时不影响主服务
  try {
    await cyrg2025Sequelize.authenticate();
    console.log('cyrg2025数据库连接成功');
  } catch (error) {
    console.warn('cyrg2025数据库连接失败，将跳过此数据库:', error.message);
  }
}

export default sequelize; 