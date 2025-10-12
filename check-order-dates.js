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

async function checkOrderDates() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    console.log('\n=== 检查订单日期分布 ===');
    
    // 1. 检查订单的日期范围
    console.log('\n1. 订单日期范围:');
    const dateRangeQuery = `
      SELECT 
        MIN(CAST(created_at AS DATE)) as min_date,
        MAX(CAST(created_at AS DATE)) as max_date,
        COUNT(*) as total_orders
      FROM orders 
      WHERE delflag = 0
    `;
    const dateRangeResult = await sequelize.query(dateRangeQuery, { type: sequelize.QueryTypes.SELECT });
    console.log('日期范围:', dateRangeResult);
    
    // 2. 检查最近几天的订单分布
    console.log('\n2. 最近10天的订单分布:');
    const recentQuery = `
      SELECT TOP 10
        CAST(created_at AS DATE) as order_date,
        COUNT(*) as order_count,
        SUM(total_amount) as total_amount
      FROM orders 
      WHERE delflag = 0
      GROUP BY CAST(created_at AS DATE)
      ORDER BY order_date DESC
    `;
    const recentResult = await sequelize.query(recentQuery, { type: sequelize.QueryTypes.SELECT });
    console.log('最近10天订单:', recentResult);
    
    // 3. 检查仙桃第一中学店的订单日期分布
    console.log('\n3. 仙桃第一中学店订单日期分布:');
    const xiantaoQuery = `
      SELECT 
        CAST(o.created_at AS DATE) as order_date,
        COUNT(*) as order_count,
        SUM(o.total_amount) as total_amount
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE s.store_name = '仙桃第一中学店' 
        AND o.delflag = 0
      GROUP BY CAST(o.created_at AS DATE)
      ORDER BY order_date DESC
    `;
    const xiantaoResult = await sequelize.query(xiantaoQuery, { type: sequelize.QueryTypes.SELECT });
    console.log('仙桃第一中学店订单:', xiantaoResult);
    
    // 4. 检查2025-10-08这一天的所有订单
    console.log('\n4. 2025-10-08这一天的订单分布:');
    const oct8Query = `
      SELECT TOP 10
        s.store_name,
        COUNT(*) as order_count,
        SUM(o.total_amount) as total_amount
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE CAST(o.created_at AS DATE) = '2025-10-08'
        AND o.delflag = 0
      GROUP BY s.id, s.store_name
      ORDER BY total_amount DESC
    `;
    const oct8Result = await sequelize.query(oct8Query, { type: sequelize.QueryTypes.SELECT });
    console.log('2025-10-08订单分布:', oct8Result);
    
    // 5. 检查仙桃第一中学店在2025-10-08的具体订单
    console.log('\n5. 仙桃第一中学店2025-10-08的具体订单:');
    const xiantaoOct8Query = `
      SELECT TOP 5
        o.id,
        o.total_amount,
        o.created_at,
        s.store_name
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE s.store_name = '仙桃第一中学店' 
        AND CAST(o.created_at AS DATE) = '2025-10-08'
        AND o.delflag = 0
      ORDER BY o.created_at DESC
    `;
    const xiantaoOct8Result = await sequelize.query(xiantaoOct8Query, { type: sequelize.QueryTypes.SELECT });
    console.log('仙桃第一中学店2025-10-08订单:', xiantaoOct8Result);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await sequelize.close();
  }
}

checkOrderDates();
