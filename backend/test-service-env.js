require('dotenv').config();

console.log('=== 服务环境变量测试 ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USERNAME:', process.env.DB_USERNAME);
console.log('cyrg2025_DB_HOST:', process.env.cyrg2025_DB_HOST);
console.log('cyrg2025_DB_NAME:', process.env.cyrg2025_DB_NAME);

// 模拟CustomerProfileService的配置
const cyrg2025Config = {
  server: process.env.cyrg2025_DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.cyrg2025_DB_PORT || '1433'),
  user: process.env.cyrg2025_DB_USER || 'hotdog',
  password: process.env.cyrg2025_DB_PASSWORD || 'Zhkj@62102218',
  database: process.env.cyrg2025_DB_NAME || 'cyrg2025',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const hotdogConfig = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.DB_PORT || '1433'),
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  database: process.env.DB_NAME || 'hotdog2030',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

console.log('\n=== 配置对象 ===');
console.log('cyrg2025Config:', JSON.stringify(cyrg2025Config, null, 2));
console.log('hotdogConfig:', JSON.stringify(hotdogConfig, null, 2)); 