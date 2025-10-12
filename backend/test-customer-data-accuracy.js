const sql = require('mssql');

const config = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'cyrg2025',
  user: process.env.DB_USER || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function testDataAccuracy() {
  let pool;
  
  try {
    console.log('=== 客户画像数据准确性测试 ===\n');
    
    pool = await sql.connect(config);
    console.log('✅ 数据库连接成功\n');

    // 1. 测试所有订单统计
    console.log('1. 测试所有订单统计:');
    const allOrdersResult = await pool.request().query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN cash > 0 THEN cash ELSE total END) as total_spend,
        AVG(CASE WHEN cash > 0 THEN cash ELSE total END) as avg_order_amount
      FROM cyrg2025.dbo.Orders 
      WHERE (payState = 2 OR payState IS NULL) 
        AND (delflag = 0 OR delflag IS NULL)
        AND recordTime IS NOT NULL
    `);
    
    const allOrders = allOrdersResult.recordset[0];
    console.log(`   总订单数: ${allOrders.total_orders.toLocaleString()}`);
    console.log(`   总消费金额: ${allOrders.total_spend.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}`);
    console.log(`   平均客单价: ${allOrders.avg_order_amount.toFixed(2)}元\n`);

    // 2. 测试有openId的客户统计
    console.log('2. 测试有openId的客户统计:');
    const customersResult = await pool.request().query(`
      SELECT 
        COUNT(DISTINCT openId) as total_customers,
        COUNT(*) as total_orders,
        SUM(CASE WHEN cash > 0 THEN cash ELSE total END) as total_spend
      FROM cyrg2025.dbo.Orders 
      WHERE openId IS NOT NULL AND openId != ''
        AND (payState = 2 OR payState IS NULL) 
        AND (delflag = 0 OR delflag IS NULL)
        AND recordTime IS NOT NULL
    `);
    
    const customers = customersResult.recordset[0];
    console.log(`   有openId的客户数: ${customers.total_customers.toLocaleString()}`);
    console.log(`   有openId客户的订单数: ${customers.total_orders.toLocaleString()}`);
    console.log(`   有openId客户的消费金额: ${customers.total_spend.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}\n`);

    // 3. 测试客户分层分布
    console.log('3. 测试客户分层分布:');
    const segmentsResult = await pool.request().query(`
      WITH CustomerSegments AS (
        SELECT 
          openId,
          COUNT(*) as order_count,
          SUM(CASE WHEN cash > 0 THEN cash ELSE total END) as total_spend,
          CASE 
            WHEN COUNT(*) >= 10 AND SUM(CASE WHEN cash > 0 THEN cash ELSE total END) >= 1000 THEN 'VIP客户'
            WHEN COUNT(*) >= 5 AND SUM(CASE WHEN cash > 0 THEN cash ELSE total END) >= 500 THEN '高价值客户'
            WHEN COUNT(*) >= 3 AND SUM(CASE WHEN cash > 0 THEN cash ELSE total END) >= 200 THEN '活跃客户'
            WHEN COUNT(*) >= 1 AND SUM(CASE WHEN cash > 0 THEN cash ELSE total END) >= 100 THEN '普通客户'
            ELSE '新客户'
          END as segment
        FROM cyrg2025.dbo.Orders 
        WHERE openId IS NOT NULL AND openId != '' 
          AND (payState = 2 OR payState IS NULL) 
          AND (delflag = 0 OR delflag IS NULL)
          AND recordTime IS NOT NULL
        GROUP BY openId
      )
      SELECT 
        segment,
        COUNT(*) as count,
        SUM(order_count) as total_orders,
        SUM(total_spend) as total_spend
      FROM CustomerSegments
      GROUP BY segment
      ORDER BY 
        CASE segment
          WHEN 'VIP客户' THEN 1
          WHEN '高价值客户' THEN 2
          WHEN '活跃客户' THEN 3
          WHEN '普通客户' THEN 4
          WHEN '新客户' THEN 5
        END
    `);
    
    console.log('   客户分层分布:');
    segmentsResult.recordset.forEach(segment => {
      console.log(`     ${segment.segment}: ${segment.count}人 (订单: ${segment.total_orders}, 消费: ${segment.total_spend.toFixed(2)}元)`);
    });
    console.log();

    // 4. 测试时间分布
    console.log('4. 测试时间分布 (前5小时):');
    const timeResult = await pool.request().query(`
      SELECT TOP 5
        DATEPART(HOUR, recordTime) as hour,
        COUNT(DISTINCT openId) as customer_count,
        COUNT(*) as order_count
      FROM cyrg2025.dbo.Orders 
      WHERE (payState = 2 OR payState IS NULL) 
        AND (delflag = 0 OR delflag IS NULL)
        AND recordTime IS NOT NULL
      GROUP BY DATEPART(HOUR, recordTime)
      ORDER BY hour
    `);
    
    timeResult.recordset.forEach(time => {
      console.log(`   ${time.hour}时: ${time.customer_count}客户, ${time.order_count}订单`);
    });
    console.log();

    console.log('✅ 数据准确性测试完成');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

testDataAccuracy(); 