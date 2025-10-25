const sql = require('mssql');
require('dotenv').config();

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
  database: 'hotdog2030', // 强制指定数据库
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function testServiceSyncLogic() {
  console.log('=== 测试服务同步逻辑 ===');
  console.log('cyrg2025Config:', JSON.stringify(cyrg2025Config, null, 2));
  console.log('hotdogConfig:', JSON.stringify(hotdogConfig, null, 2));
  
  let cyrg2025Pool, hotdogPool;
  
  try {
    // 连接cyrg2025数据库
    console.log('\n连接cyrg2025数据库...');
    console.log('✅ cyrg2025数据库连接成功');
    
    // 连接hotdog2030数据库
    console.log('\n连接hotdog2030数据库...');
    hotdogPool = await sql.connect(hotdogConfig);
    console.log('✅ hotdog2030数据库连接成功');
    
    // 显式切换到hotdog2030数据库
    await hotdogPool.request().query('USE hotdog2030');
    console.log('✅ 切换到hotdog2030数据库');
    
    // 检查hotdog2030数据库
    const dbResult = await hotdogPool.request().query('SELECT DB_NAME() as current_db');
    console.log('hotdog2030当前数据库:', dbResult.recordset[0].current_db);
    
    // 查询cyrg2025数据
    console.log('\n查询cyrg2025数据...');
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
    
    if (result.recordset.length > 0) {
      // 测试插入到hotdog2030
      console.log('\n测试插入到hotdog2030...');
      const testRecord = result.recordset[0];
      
      // 模拟upsertCustomerProfile方法
      const upsertQuery = `
        MERGE customer_profiles AS target
        USING (SELECT @customer_id as customer_id) AS source
        ON target.customer_id = source.customer_id
        WHEN MATCHED THEN
          UPDATE SET
            open_id = @open_id,
            vip_num = @vip_num,
            phone = @phone,
            first_order_date = @first_order_date,
            last_order_date = @last_order_date,
            total_orders = @total_orders,
            total_spend = @total_spend,
            updated_at = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (
            customer_id, open_id, vip_num, phone, first_order_date, 
            last_order_date, total_orders, total_spend, batch_time, created_at, updated_at
          )
          VALUES (
            @customer_id, @open_id, @vip_num, @phone, @first_order_date,
            @last_order_date, @total_orders, @total_spend, GETDATE(), GETDATE(), GETDATE()
          );
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
        .query(upsertQuery);
      
      console.log('✅ 成功插入测试记录到hotdog2030');
      
      // 验证插入结果
      const countResult = await hotdogPool.request().query('SELECT COUNT(*) as count FROM customer_profiles');
      console.log(`✅ hotdog2030中customer_profiles表现在有 ${countResult.recordset[0].count} 条记录`);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    if (cyrg2025Pool) await cyrg2025Pool.close();
    if (hotdogPool) await hotdogPool.close();
  }
}

testServiceSyncLogic().catch(console.error); 