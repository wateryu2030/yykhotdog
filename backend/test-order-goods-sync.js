// 测试订单商品明细同步
const sql = require('mssql');

const config = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'hotdog2030',
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  options: { encrypt: false, trustServerCertificate: true }
};

async function testOrderGoodsSync() {
  let pool;
  try {
    console.log('🔍 开始测试订单商品明细同步...');
    pool = await sql.connect(config);
    
    // 1. 检查order_goods表是否存在
    console.log('1. 检查order_goods表是否存在...');
    const tableResult = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'order_goods'
    `);
    console.log(`order_goods表存在: ${tableResult.recordset[0].count > 0}`);

    // 2. 检查order_goods表是否有数据
    console.log('2. 检查order_goods表数据量...');
    const countResult = await pool.request().query('SELECT COUNT(*) as count FROM order_goods');
    console.log(`order_goods表数据量: ${countResult.recordset[0].count}`);

    // 3. 检查源表cyrg2025.dbo.OrderGoods数据量
    console.log('3. 检查源表cyrg2025.dbo.OrderGoods数据量...');
    const sourceResult = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM cyrg2025.dbo.OrderGoods 
      WHERE delflag = 0
    `);
    console.log(`源表OrderGoods数据量: ${sourceResult.recordset[0].count}`);

    // 4. 检查某个订单的商品明细
    console.log('4. 检查某个订单的商品明细...');
    const sampleOrderResult = await pool.request().query(`
      SELECT TOP 1 orderId, COUNT(*) as goods_count
      FROM order_goods 
      GROUP BY orderId 
      ORDER BY goods_count DESC
    `);
    
    if (sampleOrderResult.recordset.length > 0) {
      const sampleOrderId = sampleOrderResult.recordset[0].orderId;
      console.log(`样本订单ID: ${sampleOrderId}, 商品数量: ${sampleOrderResult.recordset[0].goods_count}`);
      
      // 查看该订单的商品明细
      const goodsResult = await pool.request().query(`
        SELECT TOP 5 goodsName, goodsText, goodsNumber, goodsPrice, goodsTotal, categoryName
        FROM order_goods 
        WHERE orderId = ${sampleOrderId}
        ORDER BY id
      `);
      
      console.log('该订单的商品明细:');
      goodsResult.recordset.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.goodsName} - ${item.goodsText} - 数量:${item.goodsNumber} - 单价:¥${item.goodsPrice} - 小计:¥${item.goodsTotal}`);
      });
    }

    // 5. 检查customer_orders表中的订单是否在order_goods中有对应商品
    console.log('5. 检查订单与商品明细的匹配情况...');
    const matchResult = await pool.request().query(`
      SELECT 
        COUNT(DISTINCT o.order_id) as orders_with_goods,
        COUNT(DISTINCT o.order_id) as total_orders,
        CAST(COUNT(DISTINCT o.order_id) * 100.0 / COUNT(DISTINCT o.order_id) AS DECIMAL(5,2)) as match_percentage
      FROM customer_orders o
      LEFT JOIN order_goods g ON o.order_id = g.orderId
      WHERE g.orderId IS NOT NULL
    `);
    
    console.log(`有商品明细的订单数: ${matchResult.recordset[0].orders_with_goods}`);
    console.log(`总订单数: ${matchResult.recordset[0].total_orders}`);
    console.log(`匹配率: ${matchResult.recordset[0].match_percentage}%`);

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

testOrderGoodsSync(); 