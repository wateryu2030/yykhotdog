const sql = require('mssql');
require('dotenv').config();

const sourceConfig = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'cyrg2025',
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkSourceTables() {
  let sourcePool;
  
  try {
    console.log('🔍 检查源数据库表结构...');
    
    // 连接源数据库
    console.log('📡 连接源数据库...');
    sourcePool = await sql.connect(sourceConfig);
    console.log('✅ 源数据库连接成功');
    
    // 检查所有表
    console.log('\n📋 检查所有表...');
    const tablesResult = await sourcePool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.log('📊 所有表:');
    tablesResult.recordset.forEach(row => {
      console.log(`   - ${row.TABLE_NAME}`);
    });
    
    // 检查可能的订单表
    const possibleOrderTables = ['Orders', 'orders', 'Order', 'order', 'OrderInfo', 'order_info'];
    for (const tableName of possibleOrderTables) {
      try {
        const countResult = await sourcePool.request().query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`✅ ${tableName} 表存在，记录数: ${countResult.recordset[0].count}`);
      } catch (error) {
        console.log(`❌ ${tableName} 表不存在`);
      }
    }
    
    // 检查可能的用户表
    const possibleUserTables = ['User', 'user', 'Users', 'users', 'Customer', 'customer'];
    for (const tableName of possibleUserTables) {
      try {
        const countResult = await sourcePool.request().query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`✅ ${tableName} 表存在，记录数: ${countResult.recordset[0].count}`);
      } catch (error) {
        console.log(`❌ ${tableName} 表不存在`);
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  } finally {
    if (sourcePool) await sourcePool.close();
  }
}

// 运行检查脚本
checkSourceTables()
  .then(() => {
    console.log('\n✅ 检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }); 