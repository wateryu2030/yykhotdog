const sql = require('mssql');

const config = {
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'hotdog2030',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function testcyrg2025Query() {
  let pool;
  try {
    console.log('=== 测试cyrg2025.dbo.Orders查询 ===');
    
    console.log('1. 连接数据库...');
    pool = await sql.connect(config);
    console.log('✅ 数据库连接成功');
    
    console.log('\n2. 测试查询cyrg2025.dbo.Orders表结构...');
    const structureResult = await pool.request().query(`
      SELECT TOP 5 COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Orders' AND TABLE_SCHEMA = 'dbo'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('表结构:');
    structureResult.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}, ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    console.log('\n3. 测试查询cyrg2025.dbo.Orders数据...');
    const dataResult = await pool.request().query(`
      SELECT TOP 5 
        openId, vipId, tel, shopName, recordTime, total, payState, shopId
      FROM cyrg2025.dbo.Orders 
      WHERE openId IS NOT NULL 
        AND openId != ''
        AND total > 0
      ORDER BY recordTime DESC
    `);
    
    console.log(`查询到 ${dataResult.recordset.length} 条记录`);
    dataResult.recordset.forEach((row, index) => {
      console.log(`  ${index + 1}. openId: ${row.openId}, total: ${row.total}, city: ${row.shopName}`);
    });
    
    console.log('\n4. 测试客户统计查询...');
    const customerQuery = `
      SELECT DISTINCT
        o.openId as customer_id,
        o.openId as open_id,
        CAST(o.vipId AS VARCHAR(50)) as vip_num,
        o.tel as phone,
        NULL as nickname,
        NULL as gender,
        o.shopName,
        NULL as district,
        MIN(o.recordTime) as first_order_date,
        MAX(o.recordTime) as last_order_date,
        COUNT(*) as total_orders,
        SUM(o.total) as total_spend,
        AVG(o.total) as avg_order_amount
      FROM cyrg2025.dbo.Orders o
      WHERE o.openId IS NOT NULL 
        AND o.openId != ''
        AND o.openId NOT LIKE '%test%'
        AND o.openId NOT LIKE '%测试%'
        AND o.total > 0
        AND o.total < 100000
        AND o.recordTime IS NOT NULL
      GROUP BY o.openId, o.vipId, o.tel, o.shopName
      HAVING COUNT(*) > 0
        AND SUM(o.total) < 100000
        AND AVG(o.total) < 1000
      ORDER BY total_orders DESC
    `;
    
    const customerResult = await pool.request().query(customerQuery);
    console.log(`客户统计查询成功，找到 ${customerResult.recordset.length} 个客户`);
    
    if (customerResult.recordset.length > 0) {
      console.log('前3个客户:');
      customerResult.recordset.slice(0, 3).forEach((customer, index) => {
        console.log(`  ${index + 1}. ${customer.customer_id}: ${customer.total_orders} 订单, ${customer.total_spend} 总消费`);
      });
    }
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('数据库连接已关闭');
    }
  }
}

testcyrg2025Query(); 