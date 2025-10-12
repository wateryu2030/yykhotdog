const sql = require('mssql');

const cyrg2025Config = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME || 'cyrg2025',
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function debugPhoneCustomer() {
  try {
    console.log('调试电话号码13998270097客户...');
    
    const pool = await sql.connect(cyrg2025Config);
    
    // 1. 检查这个客户的所有订单（不限制条件）
    console.log('\n=== 检查该客户的所有订单（不限制条件） ===');
    const allOrdersQuery = `
      SELECT 
        id,
        orderNo,
        openId,
        vipTel,
        recordTime,
        total,
        payState,
        delflag,
        shopId
      FROM cyrg2025.dbo.Orders 
      WHERE vipTel = '13998270097'
      ORDER BY recordTime DESC
    `;
    
    const allOrdersResult = await pool.request().query(allOrdersQuery);
    console.log(`找到 ${allOrdersResult.recordset.length} 个订单:`);
    allOrdersResult.recordset.forEach((order, index) => {
      console.log(`${index + 1}. 订单ID: ${order.id}, openId: ${order.openId}, 金额: ${order.total}, payState: ${order.payState}, delflag: ${order.delflag}`);
    });
    
    // 2. 检查这个openId的所有订单
    console.log('\n=== 检查openId ow8du7XhcK-0_QS-5XONwoJk0-Yo 的所有订单 ===');
    const openIdQuery = `
      SELECT 
        id,
        orderNo,
        vipTel,
        recordTime,
        total,
        payState,
        delflag,
        shopId
      FROM cyrg2025.dbo.Orders 
      WHERE openId = 'ow8du7XhcK-0_QS-5XONwoJk0-Yo'
      ORDER BY recordTime DESC
    `;
    
    const openIdResult = await pool.request().query(openIdQuery);
    console.log(`找到 ${openIdResult.recordset.length} 个订单:`);
    openIdResult.recordset.forEach((order, index) => {
      console.log(`${index + 1}. 订单ID: ${order.id}, 电话: ${order.vipTel || '无'}, 金额: ${order.total}, payState: ${order.payState}, delflag: ${order.delflag}`);
    });
    
    // 3. 使用修复后的查询逻辑检查这个客户
    console.log('\n=== 使用修复后的查询逻辑检查这个客户 ===');
    const fixedQuery = `
      SELECT DISTINCT
        COALESCE(o.openId, CONCAT('CUST_', MIN(o.id))) as customer_id,
        o.openId as open_id,
        CAST(o.vipId AS VARCHAR(50)) as vip_num,
        o.vipTel as phone,
        MIN(CAST(o.recordTime AS DATE)) as first_order_date,
        MAX(CAST(o.recordTime AS DATE)) as last_order_date,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(CASE WHEN o.cash > 0 THEN o.cash ELSE o.total END) as total_spend,
        AVG(CASE WHEN o.cash > 0 THEN o.cash ELSE o.total END) as avg_order_amount
      FROM cyrg2025.dbo.Orders o
      WHERE (o.payState = 2 OR o.payState IS NULL)
        AND (o.delflag = 0 OR o.delflag IS NULL)
        AND o.recordTime IS NOT NULL
        AND o.openId IS NOT NULL
        AND o.openId != ''
        AND o.openId = 'ow8du7XhcK-0_QS-5XONwoJk0-Yo'
      GROUP BY o.openId, o.vipId, o.vipTel
    `;
    
    const fixedResult = await pool.request().query(fixedQuery);
    if (fixedResult.recordset.length > 0) {
      const customer = fixedResult.recordset[0];
      console.log(`✅ 在修复后的查询中找到该客户:`);
      console.log(`- customer_id: ${customer.customer_id}`);
      console.log(`- 订单数: ${customer.total_orders}`);
      console.log(`- 总消费: ${customer.total_spend}`);
      console.log(`- 电话: ${customer.phone || '无'}`);
    } else {
      console.log(`❌ 在修复后的查询中未找到该客户`);
    }
    
    // 4. 检查是否有其他条件导致被排除
    console.log('\n=== 检查查询条件 ===');
    const conditionCheckQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN (payState = 2 OR payState IS NULL) THEN 1 END) as valid_paystate,
        COUNT(CASE WHEN (delflag = 0 OR delflag IS NULL) THEN 1 END) as valid_delflag,
        COUNT(CASE WHEN recordTime IS NOT NULL THEN 1 END) as valid_time,
        COUNT(CASE WHEN openId IS NOT NULL THEN 1 END) as valid_openid,
        COUNT(CASE WHEN openId != '' THEN 1 END) as non_empty_openid
      FROM cyrg2025.dbo.Orders 
      WHERE openId = 'ow8du7XhcK-0_QS-5XONwoJk0-Yo'
    `;
    
    const conditionResult = await pool.request().query(conditionCheckQuery);
    const conditions = conditionResult.recordset[0];
    console.log('查询条件检查:');
    console.log(`- 总订单数: ${conditions.total_orders}`);
    console.log(`- 有效payState: ${conditions.valid_paystate}`);
    console.log(`- 有效delflag: ${conditions.valid_delflag}`);
    console.log(`- 有效时间: ${conditions.valid_time}`);
    console.log(`- 有效openId: ${conditions.valid_openid}`);
    console.log(`- 非空openId: ${conditions.non_empty_openid}`);
    
    await pool.close();
    console.log('\n调试完成');
    
  } catch (error) {
    console.error('调试失败:', error);
  }
}

debugPhoneCustomer(); 