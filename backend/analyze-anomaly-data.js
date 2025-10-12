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

async function analyzeAnomalyData() {
  try {
    console.log('分析异常数据...');
    
    const pool = await sql.connect(cyrg2025Config);
    
    // 1. 分析订单数量最多的客户详情
    console.log('\n=== 分析订单数量最多的客户详情 ===');
    const topCustomerQuery = `
      SELECT 
        openId,
        COUNT(*) as order_count,
        SUM(total) as total_spend,
        MIN(recordTime) as first_order,
        MAX(recordTime) as last_order,
        COUNT(DISTINCT CAST(recordTime AS DATE)) as unique_days,
        AVG(total) as avg_order_amount,
        MIN(total) as min_order_amount,
        MAX(total) as max_order_amount
      FROM cyrg2025.dbo.Orders 
      WHERE (payState = 2 OR payState IS NULL)
        AND (delflag = 0 OR delflag IS NULL)
        AND recordTime IS NOT NULL
      GROUP BY openId
      ORDER BY order_count DESC
      OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY
    `;
    
    const topCustomerResult = await pool.request().query(topCustomerQuery);
    topCustomerResult.recordset.forEach((customer, index) => {
      console.log(`\n第${index + 1}名客户:`);
      console.log(`- openId: ${customer.openId}`);
      console.log(`- 订单数: ${customer.order_count}`);
      console.log(`- 总消费: ${customer.total_spend}`);
      console.log(`- 首次购买: ${customer.first_order}`);
      console.log(`- 最后购买: ${customer.last_order}`);
      console.log(`- 购买天数: ${customer.unique_days}`);
      console.log(`- 平均订单金额: ${customer.avg_order_amount}`);
      console.log(`- 最小订单金额: ${customer.min_order_amount}`);
      console.log(`- 最大订单金额: ${customer.max_order_amount}`);
    });
    
    // 2. 分析第1名客户的详细订单
    console.log('\n=== 分析第1名客户的详细订单（前20个） ===');
    const firstCustomer = topCustomerResult.recordset[0];
    if (firstCustomer) {
      const detailQuery = `
        SELECT 
          id,
          orderNo,
          recordTime,
          total,
          payState,
          delflag,
          shopId,
          deliverType,
          payType
        FROM cyrg2025.dbo.Orders 
        WHERE openId = @openId
          AND (payState = 2 OR payState IS NULL)
          AND (delflag = 0 OR delflag IS NULL)
          AND recordTime IS NOT NULL
        ORDER BY recordTime DESC
        OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
      `;
      
      const detailResult = await pool.request()
        .input('openId', firstCustomer.openId)
        .query(detailQuery);
      
      console.log(`客户 ${firstCustomer.openId} 的详细订单:`);
      detailResult.recordset.forEach((order, index) => {
        console.log(`${index + 1}. 订单ID: ${order.id}, 时间: ${order.recordTime}, 金额: ${order.total}, payState: ${order.payState}, shopId: ${order.shopId}`);
      });
    }
    
    // 3. 分析订单时间分布
    console.log('\n=== 分析订单时间分布 ===');
    const timeDistributionQuery = `
      SELECT 
        YEAR(recordTime) as year,
        MONTH(recordTime) as month,
        COUNT(*) as order_count,
        COUNT(DISTINCT openId) as unique_customers
      FROM cyrg2025.dbo.Orders 
      WHERE (payState = 2 OR payState IS NULL)
        AND (delflag = 0 OR delflag IS NULL)
        AND recordTime IS NOT NULL
      GROUP BY YEAR(recordTime), MONTH(recordTime)
      ORDER BY year, month
    `;
    
    const timeDistributionResult = await pool.request().query(timeDistributionQuery);
    console.log('订单时间分布:');
    timeDistributionResult.recordset.forEach((month, index) => {
      console.log(`${month.year}-${month.month}: ${month.order_count} 个订单, ${month.unique_customers} 个客户`);
    });
    
    // 4. 分析异常订单模式
    console.log('\n=== 分析异常订单模式 ===');
    const anomalyQuery = `
      SELECT 
        openId,
        COUNT(*) as order_count,
        COUNT(DISTINCT CAST(recordTime AS DATE)) as unique_days,
        COUNT(*) / NULLIF(COUNT(DISTINCT CAST(recordTime AS DATE)), 0) as orders_per_day,
        MIN(recordTime) as first_order,
        MAX(recordTime) as last_order,
        DATEDIFF(day, MIN(recordTime), MAX(recordTime)) as days_span
      FROM cyrg2025.dbo.Orders 
      WHERE (payState = 2 OR payState IS NULL)
        AND (delflag = 0 OR delflag IS NULL)
        AND recordTime IS NOT NULL
      GROUP BY openId
      HAVING COUNT(*) > 100
      ORDER BY orders_per_day DESC
      OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
    `;
    
    const anomalyResult = await pool.request().query(anomalyQuery);
    console.log('异常订单模式（每日订单数最多的客户）:');
    anomalyResult.recordset.forEach((customer, index) => {
      console.log(`${index + 1}. openId: ${customer.openId}, 总订单: ${customer.order_count}, 购买天数: ${customer.unique_days}, 日均订单: ${customer.orders_per_day}, 时间跨度: ${customer.days_span}天`);
    });
    
    // 5. 检查是否有重复订单
    console.log('\n=== 检查重复订单 ===');
    const duplicateQuery = `
      SELECT 
        orderNo,
        COUNT(*) as duplicate_count,
        openId,
        recordTime,
        total
      FROM cyrg2025.dbo.Orders 
      WHERE (payState = 2 OR payState IS NULL)
        AND (delflag = 0 OR delflag IS NULL)
        AND recordTime IS NOT NULL
      GROUP BY orderNo, openId, recordTime, total
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
      OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
    `;
    
    const duplicateResult = await pool.request().query(duplicateQuery);
    console.log('重复订单:');
    duplicateResult.recordset.forEach((duplicate, index) => {
      console.log(`${index + 1}. 订单号: ${duplicate.orderNo}, 重复次数: ${duplicate.duplicate_count}, openId: ${duplicate.openId}`);
    });
    
    await pool.close();
    console.log('\n分析完成');
    
  } catch (error) {
    console.error('分析失败:', error);
  }
}

analyzeAnomalyData(); 