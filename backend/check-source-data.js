const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'cyrg2025', // 改为源数据库
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkSourceData() {
  try {
    console.log('正在连接源数据库...');
    const pool = await sql.connect(config);
    console.log('源数据库连接成功');

    // 首先列出所有表
    console.log('\n=== 源数据库中的所有表 ===');
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    console.log('所有表:');
    tablesResult.recordset.forEach(row => {
      console.log(`  - ${row.TABLE_NAME}`);
    });

    // 检查User表数据量
    console.log('\n=== 检查User表数据 ===');
    const userResult = await pool.request().query(`
      SELECT COUNT(*) as user_count FROM [User] WHERE delflag = 0
    `);
    console.log(`有效用户数: ${userResult.recordset[0].user_count}`);

    // 检查Orders表数据量
    console.log('\n=== 检查Orders表数据 ===');
    const ordersResult = await pool.request().query(`
      SELECT COUNT(*) as orders_count FROM [Orders] WHERE delflag = 0
    `);
    console.log(`有效订单数: ${ordersResult.recordset[0].orders_count}`);

    // 检查Goods表数据量
    console.log('\n=== 检查Goods表数据 ===');
    const goodsResult = await pool.request().query(`
      SELECT COUNT(*) as goods_count FROM [Goods] WHERE delflag = 0
    `);
    console.log(`有效商品数: ${goodsResult.recordset[0].goods_count}`);

    // 检查Shop表数据量
    console.log('\n=== 检查Shop表数据 ===');
    const shopResult = await pool.request().query(`
      SELECT COUNT(*) as shop_count FROM [Shop] WHERE Delflag = 0
    `);
    console.log(`有效店铺数: ${shopResult.recordset[0].shop_count}`);

    // 检查订单详情
    console.log('\n=== 检查订单详情 ===');
    const orderDetailResult = await pool.request().query(`
      SELECT COUNT(*) as order_detail_count FROM [OrderGoods] WHERE delflag = 0
    `);
    console.log(`订单详情数: ${orderDetailResult.recordset[0].order_detail_count}`);

    // 检查最近的数据
    console.log('\n=== 检查最近数据 ===');
    const recentOrdersResult = await pool.request().query(`
      SELECT TOP 5 recordTime as order_date, COUNT(*) as daily_orders 
      FROM [Orders] 
      WHERE delflag = 0
      GROUP BY recordTime 
      ORDER BY recordTime DESC
    `);
    console.log('最近5天的订单数:');
    recentOrdersResult.recordset.forEach(row => {
      console.log(`  ${row.order_date}: ${row.daily_orders} 订单`);
    });

    // 检查数据范围
    console.log('\n=== 检查数据范围 ===');
    const dateRangeResult = await pool.request().query(`
      SELECT 
        MIN(recordTime) as earliest_order,
        MAX(recordTime) as latest_order,
        COUNT(DISTINCT recordId) as unique_customers,
        COUNT(DISTINCT shopId) as unique_shops
      FROM [Orders]
      WHERE delflag = 0
    `);
    const range = dateRangeResult.recordset[0];
    console.log(`订单日期范围: ${range.earliest_order} 到 ${range.latest_order}`);
    console.log(`唯一客户数: ${range.unique_customers}`);
    console.log(`唯一店铺数: ${range.unique_shops}`);

    await pool.close();
    console.log('\n源数据检查完成');

  } catch (err) {
    console.error('检查数据时出错:', err);
  }
}

checkSourceData(); 