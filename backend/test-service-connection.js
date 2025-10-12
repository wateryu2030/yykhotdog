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

async function testConnection() {
  try {
    console.log('连接到数据库...');
    const pool = await sql.connect(hotdogConfig);
    
    console.log('检查当前数据库...');
    const dbResult = await pool.request().query('SELECT DB_NAME() as current_db');
    console.log('当前数据库:', dbResult.recordset[0].current_db);
    
    console.log('切换到hotdog2030数据库...');
    await pool.request().query('USE hotdog2030');
    
    console.log('再次检查当前数据库...');
    const dbResult2 = await pool.request().query('SELECT DB_NAME() as current_db');
    console.log('切换后数据库:', dbResult2.recordset[0].current_db);
    
    console.log('测试查询customer_profiles表...');
    const result = await pool.request().query('SELECT COUNT(*) as count FROM customer_profiles');
    console.log('customer_profiles表记录数:', result.recordset[0].count);
    
    console.log('测试查询cyrg2025数据库的Orders表...');
    const cyrg2025Result = await pool.request().query('SELECT COUNT(*) as count FROM cyrg2025.dbo.Orders');
    console.log('cyrg2025.Orders表记录数:', cyrg2025Result.recordset[0].count);
    
    await pool.close();
    console.log('测试完成');
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testConnection(); 