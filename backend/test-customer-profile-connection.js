const sql = require('mssql');
require('dotenv').config();

// 测试配置
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

async function testConnections() {
  console.log('=== 测试数据库连接 ===');
  
  // 测试环境变量
  console.log('\n环境变量:');
  console.log('cyrg2025_DB_HOST:', process.env.cyrg2025_DB_HOST);
  console.log('cyrg2025_DB_NAME:', process.env.cyrg2025_DB_NAME);
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_NAME:', process.env.DB_NAME);
  
  // 测试cyrg2025数据库连接
  console.log('\n测试cyrg2025数据库连接...');
  try {
    const cyrg2025Pool = await sql.connect(cyrg2025Config);
    console.log('✅ cyrg2025数据库连接成功');
    
    // 测试查询
    const cyrg2025Result = await cyrg2025Pool.request().query('SELECT TOP 1 * FROM Orders');
    console.log(`✅ cyrg2025数据库查询成功，找到 ${cyrg2025Result.recordset.length} 条记录`);
    
    await cyrg2025Pool.close();
  } catch (error) {
    console.error('❌ cyrg2025数据库连接失败:', error.message);
  }
  
  // 测试hotdog2030数据库连接
  console.log('\n测试hotdog2030数据库连接...');
  try {
    const hotdogPool = await sql.connect(hotdogConfig);
    console.log('✅ hotdog2030数据库连接成功');
    
    // 测试查询customer_profiles表
    const hotdogResult = await hotdogPool.request().query('SELECT COUNT(*) as count FROM customer_profiles');
    console.log(`✅ hotdog2030数据库查询成功，customer_profiles表有 ${hotdogResult.recordset[0].count} 条记录`);
    
    await hotdogPool.close();
  } catch (error) {
    console.error('❌ hotdog2030数据库连接失败:', error.message);
  }
  
  // 测试同步逻辑
  console.log('\n测试同步逻辑...');
  try {
    const cyrg2025Pool = await sql.connect(cyrg2025Config);
    const hotdogPool = await sql.connect(hotdogConfig);
    
    // 查询cyrg2025数据
    const customerQuery = `
      SELECT DISTINCT
        COALESCE(o.openId, CONCAT('CUST_', o.id)) as customer_id,
        o.openId as open_id,
        CAST(o.vipId AS VARCHAR(50)) as vip_num,
        o.vipTel as phone,
        MIN(CAST(o.recordTime AS DATE)) as first_order_date,
        MAX(CAST(o.recordTime AS DATE)) as last_order_date,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(CASE WHEN o.cash > 0 THEN o.cash ELSE o.total END) as total_spend
      FROM cyrg2025.dbo.Orders o
      WHERE (o.payState = 2 OR o.payState IS NULL)
        AND (o.delflag = 0 OR o.delflag IS NULL)
        AND o.recordTime IS NOT NULL
      GROUP BY o.openId, o.vipId, o.id, o.vipTel
    `;
    
    const result = await cyrg2025Pool.request().query(customerQuery);
    console.log(`✅ 从cyrg2025查询到 ${result.recordset.length} 个客户记录`);
    
    // 测试插入到hotdog2030
    if (result.recordset.length > 0) {
      const testRecord = result.recordset[0];
      const insertQuery = `
        INSERT INTO customer_profiles (
          customer_id, open_id, vip_num, phone, first_order_date, 
          last_order_date, total_orders, total_spend, batch_time
        ) VALUES (
          @customer_id, @open_id, @vip_num, @phone, @first_order_date,
          @last_order_date, @total_orders, @total_spend, GETDATE()
        )
      `;
      
      await hotdogPool.request()
        .input('customer_id', sql.VarChar, testRecord.customer_id)
        .input('open_id', sql.VarChar, testRecord.open_id)
        .input('vip_num', sql.VarChar, testRecord.vip_num)
        .input('phone', sql.VarChar, testRecord.phone)
        .input('first_order_date', sql.Date, testRecord.first_order_date)
        .input('last_order_date', sql.Date, testRecord.last_order_date)
        .input('total_orders', sql.Int, testRecord.total_orders)
        .input('total_spend', sql.Decimal(10,2), testRecord.total_spend)
        .query(insertQuery);
      
      console.log('✅ 成功插入测试记录到hotdog2030');
    }
    
    await cyrg2025Pool.close();
    await hotdogPool.close();
    
  } catch (error) {
    console.error('❌ 同步逻辑测试失败:', error.message);
  }
}

testConnections().catch(console.error); 