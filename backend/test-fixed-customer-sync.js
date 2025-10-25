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

async function testFixedCustomerSync() {
  try {
    console.log('测试修复后的客户画像同步效果...');
    
    const pool = await sql.connect(cyrg2025Config);
    
    // 使用修复后的查询逻辑（排除异常数据）
    const customerQuery = `
      SELECT DISTINCT
        COALESCE(o.openId, CONCAT('CUST_', MIN(o.id))) as customer_id,
        o.openId as open_id,
        CAST(o.vipId AS VARCHAR(50)) as vip_num,
        o.vipTel as phone,
        NULL as nickname,
        NULL as gender,
        NULL as city,
        NULL as district,
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
      GROUP BY o.openId, o.vipId, o.vipTel
      ORDER BY total_orders DESC
      OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
    `;
    
    const result = await pool.request().query(customerQuery);
    console.log(`修复后的查询找到 ${result.recordset.length} 个有效客户记录`);
    
    console.log('\n=== 修复后的客户数据（前10个） ===');
    result.recordset.slice(0, 10).forEach((customer, index) => {
      console.log(`${index + 1}. customer_id: ${customer.customer_id}, 订单数: ${customer.total_orders}, 总消费: ${customer.total_spend}, 电话: ${customer.phone || '无'}`);
    });
    
    // 特别检查电话号码13998270097的客户
    console.log('\n=== 检查电话号码13998270097的客户 ===');
    const phoneCustomer = result.recordset.find(c => c.phone === '13998270097');
    if (phoneCustomer) {
      console.log(`✅ 找到电话号码13998270097的客户:`);
      console.log(`- customer_id: ${phoneCustomer.customer_id}`);
      console.log(`- openId: ${phoneCustomer.open_id}`);
      console.log(`- 订单数: ${phoneCustomer.total_orders}`);
      console.log(`- 总消费: ${phoneCustomer.total_spend}`);
      console.log(`- 首次购买: ${phoneCustomer.first_order_date}`);
      console.log(`- 最后购买: ${phoneCustomer.last_order_date}`);
    } else {
      console.log(`❌ 未找到电话号码13998270097的客户`);
    }
    
    // 检查购买次数最多的客户
    console.log('\n=== 购买次数最多的客户（修复后） ===');
    const topCustomers = result.recordset.slice(0, 5);
    topCustomers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.customer_id} - ${customer.total_orders} 个订单，总消费: ${customer.total_spend}`);
    });
    
    // 统计有效客户总数
    console.log('\n=== 有效客户统计 ===');
    const totalQuery = `
      SELECT COUNT(DISTINCT openId) as total_valid_customers
      FROM cyrg2025.dbo.Orders 
      WHERE (payState = 2 OR payState IS NULL)
        AND (delflag = 0 OR delflag IS NULL)
        AND recordTime IS NOT NULL
        AND openId IS NOT NULL
        AND openId != ''
    `;
    
    const totalResult = await pool.request().query(totalQuery);
    console.log(`有效客户总数: ${totalResult.recordset[0].total_valid_customers}`);
    
    // 对比修复前后的数据
    console.log('\n=== 修复前后对比 ===');
    console.log('修复前: 包含openId为null和空字符串的异常数据');
    console.log('修复后: 只包含有效的客户数据');
    console.log('这样可以确保客户画像分析的准确性');
    
    await pool.close();
    console.log('\n测试完成');
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testFixedCustomerSync(); 