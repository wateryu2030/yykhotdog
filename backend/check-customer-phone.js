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

async function checkCustomerPhone() {
  try {
    console.log('连接到cyrg2025数据库...');
    console.log('数据库配置:', {
      server: cyrg2025Config.server,
      port: cyrg2025Config.port,
      database: cyrg2025Config.database,
      user: cyrg2025Config.user
    });
    
    const pool = await sql.connect(cyrg2025Config);
    
    // 查询包含电话号码13998270097的订单
    console.log('\n=== 查询包含电话号码13998270097的订单 ===');
    const phoneQuery = `
      SELECT 
        id,
        orderNo,
        openId,
        vipId,
        vipTel,
        recordTime,
        total,
        payState,
        shopId
      FROM cyrg2025.dbo.Orders 
      WHERE vipTel = '13998270097'
      ORDER BY recordTime DESC
    `;
    
    const phoneResult = await pool.request().query(phoneQuery);
    console.log(`找到 ${phoneResult.recordset.length} 个包含该电话号码的订单:`);
    phoneResult.recordset.forEach((order, index) => {
      console.log(`${index + 1}. 订单ID: ${order.id}, 订单号: ${order.orderNo}, openId: ${order.openId}, 时间: ${order.recordTime}, 金额: ${order.total}`);
    });
    
    // 查询所有包含电话号码的订单（前10个）
    console.log('\n=== 查询所有包含电话号码的订单（前10个） ===');
    const allPhoneQuery = `
      SELECT 
        id,
        orderNo,
        openId,
        vipId,
        vipTel,
        recordTime,
        total,
        payState
      FROM cyrg2025.dbo.Orders 
      WHERE vipTel IS NOT NULL AND vipTel != ''
      ORDER BY recordTime DESC
      OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
    `;
    
    const allPhoneResult = await pool.request().query(allPhoneQuery);
    console.log(`找到 ${allPhoneResult.recordset.length} 个包含电话号码的订单:`);
    allPhoneResult.recordset.forEach((order, index) => {
      console.log(`${index + 1}. 订单ID: ${order.id}, 订单号: ${order.orderNo}, openId: ${order.openId}, 电话: ${order.vipTel}, 时间: ${order.recordTime}, 金额: ${order.total}`);
    });
    
    // 查询购买次数最多的客户（按openId分组）
    console.log('\n=== 查询购买次数最多的客户（按openId分组） ===');
    const topCustomersQuery = `
      SELECT 
        openId,
        COUNT(*) as order_count,
        SUM(total) as total_spend,
        MIN(recordTime) as first_order,
        MAX(recordTime) as last_order,
        vipTel
      FROM cyrg2025.dbo.Orders 
      WHERE (payState = 2 OR payState IS NULL)
        AND (delflag = 0 OR delflag IS NULL)
        AND recordTime IS NOT NULL
      GROUP BY openId, vipTel
      ORDER BY order_count DESC
      OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
    `;
    
    const topCustomersResult = await pool.request().query(topCustomersQuery);
    console.log(`购买次数最多的客户:`);
    topCustomersResult.recordset.forEach((customer, index) => {
      console.log(`${index + 1}. openId: ${customer.openId}, 订单数: ${customer.order_count}, 总消费: ${customer.total_spend}, 电话: ${customer.vipTel || '无'}, 首次购买: ${customer.first_order}, 最后购买: ${customer.last_order}`);
    });
    
    // 查询特定openId的订单数量
    console.log('\n=== 查询特定openId的订单数量 ===');
    const specificOpenIds = ['oJzKq5h69y6DTqdB6Ev9mEo_YEzc', '2088712222994918', '2088402478854282'];
    
    for (const openId of specificOpenIds) {
      const specificQuery = `
        SELECT 
          openId,
          COUNT(*) as order_count,
          SUM(total) as total_spend,
          MIN(recordTime) as first_order,
          MAX(recordTime) as last_order,
          vipTel
        FROM cyrg2025.dbo.Orders 
        WHERE openId = @openId
          AND (payState = 2 OR payState IS NULL)
          AND (delflag = 0 OR delflag IS NULL)
          AND recordTime IS NOT NULL
        GROUP BY openId, vipTel
      `;
      
      const specificResult = await pool.request()
        .input('openId', openId)
        .query(specificQuery);
      
      if (specificResult.recordset.length > 0) {
        const customer = specificResult.recordset[0];
        console.log(`openId: ${customer.openId}, 订单数: ${customer.order_count}, 总消费: ${customer.total_spend}, 电话: ${customer.vipTel || '无'}`);
      } else {
        console.log(`openId: ${openId} - 未找到订单`);
      }
    }
    
    await pool.close();
    console.log('\n查询完成');
    
  } catch (error) {
    console.error('查询失败:', error);
  }
}

checkCustomerPhone(); 