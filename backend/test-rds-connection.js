const { Sequelize } = require('sequelize');

async function testRDSConnection() {
  console.log('=== 测试阿里云RDS数据库连接 ===');
  
  const sequelize = new Sequelize('cyrg2025', 'hotdog', 'Zhkj@62102218', {
    host: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
    port: parseInt(process.env.DB_PORT) || 1433,
    dialect: 'mssql',
    logging: false,
    dialectOptions: {
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    },
    timezone: '+08:00'
  });

  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功！');
    
    // 测试查询
    console.log('正在测试查询...');
    const [results] = await sequelize.query('SELECT @@VERSION as version');
    console.log('✅ 查询测试成功！');
    console.log('SQL Server版本:', results[0].version);
    
    // 检查数据库是否存在
    console.log('正在检查数据库...');
    const [databases] = await sequelize.query("SELECT name FROM sys.databases WHERE name = 'cyrg2025'");
    if (databases.length > 0) {
      console.log('✅ 数据库 cyrg2025 存在');
    } else {
      console.log('⚠️  数据库 cyrg2025 不存在，需要创建');
    }
    
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    await sequelize.close();
    console.log('数据库连接已关闭');
  }
}

testRDSConnection(); 