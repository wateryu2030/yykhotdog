const sql = require('mssql');
require('dotenv').config();

const cyrg2025Config = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.DB_PORT) || 1433,
  user: process.env.DB_USER || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  database: process.env.DB_NAME || 'cyrg2025',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkSyncIssue() {
  try {
    console.log('🔍 检查同步问题...\n');
    
    // 连接cyrg2025数据库
    const cyrg2025Pool = await sql.connect(cyrg2025Config);
    console.log('已连接到cyrg2025数据库');
    
    // 1. 检查cyrg2025数据库中购买次数最多的客户
    console.log('\n=== cyrg2025数据库中购买次数最多的客户 ===');
    const topcyrg2025Query = `
      SELECT TOP 10 
        openId,
        COUNT(*) as order_count,
        SUM(ISNULL(total, 0) + ISNULL(vipAmount, 0) + ISNULL(vipAmountZengSong, 0) + ISNULL(cash, 0)) as total_amount
      FROM cyrg2025.dbo.Orders 
      WHERE delflag = 0 AND openId IS NOT NULL AND openId != ''
      GROUP BY openId
      ORDER BY order_count DESC
    `;
    
    const topcyrg2025Result = await cyrg2025Pool.request().query(topcyrg2025Query);
    console.log('cyrg2025数据库中购买次数最多的客户:');
    topcyrg2025Result.recordset.forEach((customer, index) => {
      console.log(`${index + 1}. openId: ${customer.openId} - 订单数: ${customer.order_count} - 总金额: ¥${customer.total_amount.toFixed(2)}`);
    });
    
    // 2. 检查hotdog2030数据库中对应的客户
    console.log('\n=== 检查hotdog2030数据库中的对应客户 ===');
    const hotdogConfig = {
      ...cyrg2025Config,
      database: 'hotdog2030'
    };
    
    const hotdogPool = await sql.connect(hotdogConfig);
    console.log('已连接到hotdog2030数据库');
    
    for (const customer of topcyrg2025Result.recordset) {
      const checkQuery = `
        SELECT 
          c.id,
          c.customer_name,
          c.open_id,
          cp.total_orders,
          cp.total_spend
        FROM customer c
        LEFT JOIN customer_profiles cp ON c.id = cp.customer_id
        WHERE c.open_id = @openId
      `;
      
      const result = await hotdogPool.request()
        .input('openId', sql.NVarChar, customer.openId)
        .query(checkQuery);
      
      if (result.recordset.length > 0) {
        const profile = result.recordset[0];
        console.log(`✅ openId: ${customer.openId} - 已同步，订单数: ${profile.total_orders} (cyrg2025: ${customer.order_count})`);
      } else {
        console.log(`❌ openId: ${customer.openId} - 未同步，cyrg2025订单数: ${customer.order_count}`);
      }
    }
    
    await cyrg2025Pool.close();
    await hotdogPool.close();
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

checkSyncIssue(); 