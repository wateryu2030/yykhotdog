const { Sequelize } = require('sequelize');

// 数据库连接配置
const sequelize = new Sequelize({
  dialect: 'mssql',
  host: 'localhost',
  port: 1433,
  database: 'hotdog2030',
  username: 'sa',
  password: 'Hotdog123!',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  }
});

async function debugStoreOrders() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    console.log('\n=== 调试仙桃第一中学店数据绑定问题 ===');
    
    // 1. 检查仙桃第一中学店基本信息
    console.log('\n1. 仙桃第一中学店基本信息:');
    const storeQuery = 'SELECT id, store_name, store_code, status FROM stores WHERE id = 59 AND delflag = 0';
    const storeResult = await sequelize.query(storeQuery, { type: sequelize.QueryTypes.SELECT });
    console.log('门店信息:', storeResult);
    
    // 2. 检查是否有其他仙桃相关的门店
    console.log('\n2. 所有仙桃相关门店:');
    const xiantaoQuery = "SELECT id, store_name, store_code, status FROM stores WHERE store_name LIKE '%仙桃%' AND delflag = 0";
    const xiantaoResult = await sequelize.query(xiantaoQuery, { type: sequelize.QueryTypes.SELECT });
    console.log('仙桃相关门店:', xiantaoResult);
    
    // 3. 检查订单表中是否有仙桃相关的订单
    console.log('\n3. 检查订单表中的仙桃相关数据:');
    const orderQuery = `
      SELECT TOP 10 
        o.id, 
        o.store_id, 
        s.store_name, 
        o.total_amount, 
        o.created_at
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE s.store_name LIKE '%仙桃%' 
        AND o.delflag = 0
      ORDER BY o.created_at DESC
    `;
    const orderResult = await sequelize.query(orderQuery, { type: sequelize.QueryTypes.SELECT });
    console.log('仙桃相关订单:', orderResult);
    
    // 4. 检查昨天(2025-10-08)的订单数据
    console.log('\n4. 检查昨天(2025-10-08)的订单数据:');
    const yesterdayQuery = `
      SELECT 
        s.store_name,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_amount
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE s.store_name LIKE '%仙桃%'
        AND o.delflag = 0
        AND CAST(o.created_at AS DATE) = '2025-10-08'
      GROUP BY s.id, s.store_name
    `;
    const yesterdayResult = await sequelize.query(yesterdayQuery, { type: sequelize.QueryTypes.SELECT });
    console.log('昨天仙桃订单:', yesterdayResult);
    
    // 5. 检查所有门店昨天的订单分布
    console.log('\n5. 昨天(2025-10-08)所有门店订单TOP 10:');
    const allYesterdayQuery = `
      SELECT TOP 10
        s.store_name,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_amount
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.delflag = 0
        AND CAST(o.created_at AS DATE) = '2025-10-08'
        AND s.store_name IS NOT NULL
      GROUP BY s.id, s.store_name
      ORDER BY total_amount DESC
    `;
    const allYesterdayResult = await sequelize.query(allYesterdayQuery, { type: sequelize.QueryTypes.SELECT });
    console.log('昨天TOP 10门店:', allYesterdayResult);
    
    // 6. 检查store_id字段的数据类型和值
    console.log('\n6. 检查orders表的store_id字段:');
    const storeIdQuery = `
      SELECT TOP 10
        store_id,
        COUNT(*) as order_count
      FROM orders 
      WHERE delflag = 0
      GROUP BY store_id
      ORDER BY order_count DESC
    `;
    const storeIdResult = await sequelize.query(storeIdQuery, { type: sequelize.QueryTypes.SELECT });
    console.log('store_id分布:', storeIdResult);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await sequelize.close();
  }
}

debugStoreOrders();
