const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkTableStructure() {
  try {
    console.log('🔍 检查表结构...');
    
    const pool = await sql.connect(config);
    
    // 检查customer_orders表结构
    console.log('\n📊 customer_orders表结构:');
    const orderStructure = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'customer_orders'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.table(orderStructure.recordset);
    
    // 检查customer_profiles表结构
    console.log('\n📊 customer_profiles表结构:');
    const profileStructure = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'customer_profiles'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.table(profileStructure.recordset);
    
    // 检查order_goods表结构
    console.log('\n📊 order_goods表结构:');
    const goodsStructure = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'order_goods'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.table(goodsStructure.recordset);
    
    // 检查是否有其他包含城市或店铺信息的表
    console.log('\n🔍 查找包含城市或店铺信息的表:');
    const tablesWithLocation = await pool.request().query(`
      SELECT TABLE_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME LIKE '%city%' 
         OR COLUMN_NAME LIKE '%store%' 
         OR COLUMN_NAME LIKE '%shop%'
         OR COLUMN_NAME LIKE '%location%'
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);
    
    console.table(tablesWithLocation.recordset);
    
    await pool.close();
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkTableStructure(); 