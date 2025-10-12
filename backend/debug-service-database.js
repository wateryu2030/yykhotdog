const sql = require('mssql');

// 模拟服务的数据库配置
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

async function debugServiceDatabase() {
  try {
    console.log('=== 调试服务数据库连接 ===');
    console.log('配置:', JSON.stringify(hotdogConfig, null, 2));
    
    const pool = await sql.connect(hotdogConfig);
    console.log('✅ 数据库连接成功');
    
    // 检查当前数据库
    const dbResult = await pool.request().query('SELECT DB_NAME() as current_db');
    console.log('当前数据库:', dbResult.recordset[0].current_db);
    
    // 检查数据库中的所有表
    console.log('\n=== 检查数据库中的所有表 ===');
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.log('数据库中的表:');
    tablesResult.recordset.forEach(row => {
      console.log(`  - ${row.TABLE_NAME}`);
    });
    
    // 检查customer_profiles表
    console.log('\n=== 检查customer_profiles表 ===');
    try {
      const countResult = await pool.request().query('SELECT COUNT(*) as count FROM customer_profiles');
      console.log('customer_profiles表记录数:', countResult.recordset[0].count);
      
      if (countResult.recordset[0].count > 0) {
        const sampleResult = await pool.request().query('SELECT TOP 3 * FROM customer_profiles');
        console.log('样本数据:', JSON.stringify(sampleResult.recordset, null, 2));
      }
    } catch (error) {
      console.log('❌ customer_profiles表查询失败:', error.message);
    }
    
    // 检查cyrg2025数据库
    console.log('\n=== 检查cyrg2025数据库 ===');
    try {
      const cyrg2025CountResult = await pool.request().query('SELECT COUNT(*) as count FROM cyrg2025.dbo.Orders');
      console.log('cyrg2025.Orders表记录数:', cyrg2025CountResult.recordset[0].count);
    } catch (error) {
      console.log('❌ cyrg2025.Orders表查询失败:', error.message);
    }
    
    await pool.close();
    console.log('\n✅ 调试完成');
    
  } catch (error) {
    console.error('❌ 调试失败:', error);
  }
}

debugServiceDatabase(); 