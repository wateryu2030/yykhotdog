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

async function deepAnalyzeNullCustomers() {
  try {
    console.log('深入分析openId为null的客户数据...');
    
    const pool = await sql.connect(cyrg2025Config);
    
    // 1. 分析openId为null的订单详情
    console.log('\n=== 分析openId为null的订单详情 ===');
    const nullCustomerQuery = `
      SELECT 
        id,
        orderNo,
        recordTime,
        total,
        payState,
        delflag,
        shopId,
        deliverType,
        payType,
        vipTel,
        vipId
      FROM cyrg2025.dbo.Orders 
      WHERE openId IS NULL
        AND (payState = 2 OR payState IS NULL)
        AND (delflag = 0 OR delflag IS NULL)
        AND recordTime IS NOT NULL
      ORDER BY recordTime DESC
      OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
    `;
    
    const nullCustomerResult = await pool.request().query(nullCustomerQuery);
    console.log(`openId为null的订单详情（前20个）:`);
    nullCustomerResult.recordset.forEach((order, index) => {
      console.log(`${index + 1}. 订单ID: ${order.id}, 订单号: ${order.orderNo}, 时间: ${order.recordTime}, 金额: ${order.total}, payState: ${order.payState}, shopId: ${order.shopId}, 电话: ${order.vipTel || '无'}`);
    });
    
    // 2. 分析openId为null的订单时间分布
    console.log('\n=== 分析openId为null的订单时间分布 ===');
    const nullTimeQuery = `
      SELECT 
        CAST(recordTime AS DATE) as order_date,
        COUNT(*) as daily_orders,
        SUM(total) as daily_amount,
        COUNT(DISTINCT shopId) as shops_count
      FROM cyrg2025.dbo.Orders 
      WHERE openId IS NULL
        AND (payState = 2 OR payState IS NULL)
        AND (delflag = 0 OR delflag IS NULL)
        AND recordTime IS NOT NULL
      GROUP BY CAST(recordTime AS DATE)
      ORDER BY order_date DESC
      OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
    `;
    
    const nullTimeResult = await pool.request().query(nullTimeQuery);
    console.log('openId为null的订单每日分布（最近20天）:');
    nullTimeResult.recordset.forEach((day, index) => {
      console.log(`${index + 1}. ${day.order_date}: ${day.daily_orders} 个订单, 总金额: ${day.daily_amount}, 涉及店铺: ${day.shops_count}`);
    });
    
    // 3. 分析openId为null的订单店铺分布
    console.log('\n=== 分析openId为null的订单店铺分布 ===');
    const nullShopQuery = `
      SELECT 
        shopId,
        COUNT(*) as order_count,
        SUM(total) as total_amount,
        MIN(recordTime) as first_order,
        MAX(recordTime) as last_order
      FROM cyrg2025.dbo.Orders 
      WHERE openId IS NULL
        AND (payState = 2 OR payState IS NULL)
        AND (delflag = 0 OR delflag IS NULL)
        AND recordTime IS NOT NULL
      GROUP BY shopId
      ORDER BY order_count DESC
      OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
    `;
    
    const nullShopResult = await pool.request().query(nullShopQuery);
    console.log('openId为null的订单店铺分布:');
    nullShopResult.recordset.forEach((shop, index) => {
      console.log(`${index + 1}. 店铺ID: ${shop.shopId}, 订单数: ${shop.order_count}, 总金额: ${shop.total_amount}, 时间范围: ${shop.first_order} 到 ${shop.last_order}`);
    });
    
    // 4. 检查是否有其他异常模式
    console.log('\n=== 检查其他异常模式 ===');
    const anomalyPatternQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(DISTINCT openId) as unique_customers,
        COUNT(CASE WHEN openId IS NULL THEN 1 END) as null_customers,
        COUNT(CASE WHEN openId = '' THEN 1 END) as empty_customers,
        COUNT(CASE WHEN openId IS NOT NULL AND openId != '' THEN 1 END) as valid_customers,
        COUNT(DISTINCT orderNo) as unique_order_numbers,
        COUNT(*) - COUNT(DISTINCT orderNo) as duplicate_orders
      FROM cyrg2025.dbo.Orders 
      WHERE (payState = 2 OR payState IS NULL)
        AND (delflag = 0 OR delflag IS NULL)
        AND recordTime IS NOT NULL
    `;
    
    const anomalyPatternResult = await pool.request().query(anomalyPatternQuery);
    const pattern = anomalyPatternResult.recordset[0];
    console.log('整体数据质量分析:');
    console.log(`- 总订单数: ${pattern.total_orders}`);
    console.log(`- 唯一客户数: ${pattern.unique_customers}`);
    console.log(`- openId为null的订单: ${pattern.null_customers} (${(pattern.null_customers/pattern.total_orders*100).toFixed(2)}%)`);
    console.log(`- openId为空的订单: ${pattern.empty_customers} (${(pattern.empty_customers/pattern.total_orders*100).toFixed(2)}%)`);
    console.log(`- 有效客户订单: ${pattern.valid_customers} (${(pattern.valid_customers/pattern.total_orders*100).toFixed(2)}%)`);
    console.log(`- 唯一订单号: ${pattern.unique_order_numbers}`);
    console.log(`- 重复订单: ${pattern.duplicate_orders}`);
    
    // 5. 建议的修复方案
    console.log('\n=== 数据修复建议 ===');
    console.log('1. 排除openId为null和空字符串的订单进行客户画像分析');
    console.log('2. 清理重复订单数据');
    console.log('3. 调查openId为null的原因（可能是系统集成问题）');
    console.log('4. 重新计算有效的客户购买统计');
    
    await pool.close();
    console.log('\n分析完成');
    
  } catch (error) {
    console.error('分析失败:', error);
  }
}

deepAnalyzeNullCustomers(); 