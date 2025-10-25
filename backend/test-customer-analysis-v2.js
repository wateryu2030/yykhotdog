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

async function testCustomerAnalysisV2() {
  let pool;
  
  try {
    console.log('=== 客户画像数据准确性测试 V2 ===\n');
    
    pool = await sql.connect(config);
    console.log('✅ 数据库连接成功\n');

    // 1. 按照用户提供的SQL测试消费次数大于5的客户
    console.log('1. 消费次数大于5的客户分析:');
    const highValueCustomersResult = await pool.request().query(`
      SELECT 
        openId AS 用户ID,
        SUM(total + vipAmount + vipAmountZengSong + cash) AS 总消费,
        COUNT(*) AS 消费次数,
        MIN(success_time) AS 第一次消费日期,
        MAX(success_time) AS 最后消费日期 
      FROM dbo.Orders 
      WHERE delflag = 0 
        AND payState IN (1,2,3) 
        AND openId != ''
      GROUP BY openId 
      HAVING COUNT(*) > 4 
      ORDER BY COUNT(*) DESC
    `);
    
    const highValueCustomers = highValueCustomersResult.recordset;
    const totalHighValueCustomers = highValueCustomers.length;
    const totalHighValueOrders = highValueCustomers.reduce((sum, customer) => sum + customer.消费次数, 0);
    const totalHighValueSpend = highValueCustomers.reduce((sum, customer) => sum + customer.总消费, 0);
    
    console.log(`   消费次数大于5的客户数: ${totalHighValueCustomers.toLocaleString()}`);
    console.log(`   这些客户的订单总数: ${totalHighValueOrders.toLocaleString()}`);
    console.log(`   这些客户的总消费: ${totalHighValueSpend.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}`);
    console.log(`   平均每个高价值客户消费: ${(totalHighValueSpend / totalHighValueCustomers).toFixed(2)}元`);
    console.log(`   平均每个高价值客户订单数: ${(totalHighValueOrders / totalHighValueCustomers).toFixed(1)}单\n`);

    // 2. 测试所有有效订单统计
    console.log('2. 所有有效订单统计:');
    const allOrdersResult = await pool.request().query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total + vipAmount + vipAmountZengSong + cash) as total_spend,
        AVG(total + vipAmount + vipAmountZengSong + cash) as avg_order_amount
      FROM dbo.Orders 
      WHERE delflag = 0 
        AND payState IN (1,2,3)
    `);
    
    const allOrders = allOrdersResult.recordset[0];
    console.log(`   总订单数: ${allOrders.total_orders.toLocaleString()}`);
    console.log(`   总消费金额: ${allOrders.total_spend.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}`);
    console.log(`   平均客单价: ${allOrders.avg_order_amount.toFixed(2)}元\n`);

    // 3. 测试有openId的客户统计
    console.log('3. 有openId的客户统计:');
    const customersResult = await pool.request().query(`
      SELECT 
        COUNT(DISTINCT openId) as total_customers,
        COUNT(*) as total_orders,
        SUM(total + vipAmount + vipAmountZengSong + cash) as total_spend
      FROM dbo.Orders 
      WHERE delflag = 0 
        AND payState IN (1,2,3)
        AND openId != ''
    `);
    
    const customers = customersResult.recordset[0];
    console.log(`   有openId的客户数: ${customers.total_customers.toLocaleString()}`);
    console.log(`   有openId客户的订单数: ${customers.total_orders.toLocaleString()}`);
    console.log(`   有openId客户的消费金额: ${customers.total_spend.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}\n`);

    // 4. 测试客户分层分布（基于新的消费计算方式）
    console.log('4. 客户分层分布（基于新消费计算）:');
    const segmentsResult = await pool.request().query(`
      WITH CustomerSegments AS (
        SELECT 
          openId,
          COUNT(*) as order_count,
          SUM(total + vipAmount + vipAmountZengSong + cash) as total_spend,
          CASE 
            WHEN COUNT(*) >= 10 AND SUM(total + vipAmount + vipAmountZengSong + cash) >= 1000 THEN 'VIP客户'
            WHEN COUNT(*) >= 5 AND SUM(total + vipAmount + vipAmountZengSong + cash) >= 500 THEN '高价值客户'
            WHEN COUNT(*) >= 3 AND SUM(total + vipAmount + vipAmountZengSong + cash) >= 200 THEN '活跃客户'
            WHEN COUNT(*) >= 1 AND SUM(total + vipAmount + vipAmountZengSong + cash) >= 100 THEN '普通客户'
            ELSE '新客户'
          END as segment
        FROM dbo.Orders 
        WHERE delflag = 0 
          AND payState IN (1,2,3)
          AND openId != ''
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

    // 5. 显示前10个高价值客户
    console.log('5. 前10个高价值客户:');
    highValueCustomers.slice(0, 10).forEach((customer, index) => {
      console.log(`   ${index + 1}. 用户${customer.用户ID.substring(0, 8)}... - ${customer.消费次数}单 - ${customer.总消费.toFixed(2)}元`);
    });
    console.log();

    console.log('✅ 客户画像数据准确性测试 V2 完成');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

testCustomerAnalysisV2(); 