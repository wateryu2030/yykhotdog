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

async function checkPhoneCustomer() {
  try {
    console.log('检查电话号码13998270097客户的所有订单...');
    
    const pool = await sql.connect(cyrg2025Config);
    
    // 查询该客户的所有订单（不限制payState）
    const allOrdersQuery = `
      SELECT 
        id,
        orderNo,
        openId,
        vipTel,
        recordTime,
        total,
        payState,
        delflag
      FROM cyrg2025.dbo.Orders 
      WHERE vipTel = '13998270097'
      ORDER BY recordTime DESC
    `;
    
    const allOrdersResult = await pool.request().query(allOrdersQuery);
    console.log(`找到 ${allOrdersResult.recordset.length} 个订单:`);
    
    allOrdersResult.recordset.forEach((order, index) => {
      console.log(`${index + 1}. 订单ID: ${order.id}, 订单号: ${order.orderNo}, openId: ${order.openId}, 时间: ${order.recordTime}, 金额: ${order.total}, payState: ${order.payState}, delflag: ${order.delflag}`);
    });
    
    // 按payState分组统计
    console.log('\n=== 按payState分组统计 ===');
    const payStateQuery = `
      SELECT 
        payState,
        COUNT(*) as order_count,
        SUM(total) as total_amount
      FROM cyrg2025.dbo.Orders 
      WHERE vipTel = '13998270097'
      GROUP BY payState
      ORDER BY payState
    `;
    
    const payStateResult = await pool.request().query(payStateQuery);
    payStateResult.recordset.forEach((stat, index) => {
      console.log(`payState ${stat.payState}: ${stat.order_count} 个订单，总金额: ${stat.total_amount}`);
    });
    
    // 检查该客户的openId
    console.log('\n=== 检查该客户的openId ===');
    const openIdQuery = `
      SELECT DISTINCT openId, COUNT(*) as order_count
      FROM cyrg2025.dbo.Orders 
      WHERE vipTel = '13998270097'
      GROUP BY openId
    `;
    
    const openIdResult = await pool.request().query(openIdQuery);
    openIdResult.recordset.forEach((customer, index) => {
      console.log(`openId: ${customer.openId}, 订单数: ${customer.order_count}`);
    });
    
    await pool.close();
    console.log('\n检查完成');
    
  } catch (error) {
    console.error('检查失败:', error);
  }
}

checkPhoneCustomer(); 