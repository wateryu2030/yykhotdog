// 检查源表商品明细数据
const sql = require('mssql');

const config = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'cyrg2025',
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  options: { encrypt: false, trustServerCertificate: true }
};

async function checkSourceGoodsData() {
  let pool;
  try {
    console.log('🔍 检查源表商品明细数据...');
    pool = await sql.connect(config);
    
    // 1. 检查价格字段的统计信息
    console.log('1. 检查价格字段统计信息...');
    const priceStatsResult = await pool.request().query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN goodsPrice > 0 THEN 1 END) as records_with_price,
        COUNT(CASE WHEN goodsTotal > 0 THEN 1 END) as records_with_total,
        AVG(goodsPrice) as avg_price,
        AVG(goodsTotal) as avg_total,
        MAX(goodsPrice) as max_price,
        MAX(goodsTotal) as max_total
      FROM OrderGoods 
      WHERE delflag = 0
    `);
    
    const stats = priceStatsResult.recordset[0];
    console.log(`总记录数: ${stats.total_records}`);
    console.log(`有价格的记录数: ${stats.records_with_price}`);
    console.log(`有小计的记录数: ${stats.records_with_total}`);
    console.log(`平均价格: ¥${stats.avg_price?.toFixed(2) || '0.00'}`);
    console.log(`平均小计: ¥${stats.avg_total?.toFixed(2) || '0.00'}`);
    console.log(`最高价格: ¥${stats.max_price?.toFixed(2) || '0.00'}`);
    console.log(`最高小计: ¥${stats.max_total?.toFixed(2) || '0.00'}`);
    
    // 2. 检查某个订单的商品明细
    console.log('2. 检查样本订单的商品明细...');
    const sampleOrderResult = await pool.request().query(`
      SELECT TOP 1 orderId, COUNT(*) as goods_count
      FROM OrderGoods 
      WHERE delflag = 0
      GROUP BY orderId 
      ORDER BY goods_count DESC
    `);
    
    if (sampleOrderResult.recordset.length > 0) {
      const sampleOrderId = sampleOrderResult.recordset[0].orderId;
      console.log(`样本订单ID: ${sampleOrderId}, 商品数量: ${sampleOrderResult.recordset[0].goods_count}`);
      
      // 查看该订单的商品明细
      const goodsResult = await pool.request().query(`
        SELECT TOP 10 
          goodsName, goodsText, goodsNumber, goodsPrice, goodsTotal, 
          standardPrice, standardTotal, realIncomeAmount, categoryName
        FROM OrderGoods 
        WHERE orderId = ${sampleOrderId} AND delflag = 0
        ORDER BY id
      `);
      
      console.log('该订单的商品明细:');
      goodsResult.recordset.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.goodsName} - 数量:${item.goodsNumber} - 价格:¥${item.goodsPrice} - 小计:¥${item.goodsTotal} - 标准价:¥${item.standardPrice} - 标准小计:¥${item.standardTotal} - 实收:¥${item.realIncomeAmount}`);
      });
    }
    
    // 3. 检查是否有其他价格字段
    console.log('3. 检查其他价格字段...');
    const otherPriceResult = await pool.request().query(`
      SELECT TOP 5 
        orderId, goodsName, goodsPrice, goodsTotal, standardPrice, standardTotal, realIncomeAmount
      FROM OrderGoods 
      WHERE delflag = 0 AND (standardPrice > 0 OR realIncomeAmount > 0)
      ORDER BY standardPrice DESC
    `);
    
    if (otherPriceResult.recordset.length > 0) {
      console.log('找到有标准价格或实收金额的记录:');
      otherPriceResult.recordset.forEach((item, index) => {
        console.log(`  ${index + 1}. 订单${item.orderId} - ${item.goodsName} - 价格:¥${item.goodsPrice} - 小计:¥${item.goodsTotal} - 标准价:¥${item.standardPrice} - 实收:¥${item.realIncomeAmount}`);
      });
    } else {
      console.log('没有找到有标准价格或实收金额的记录');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkSourceGoodsData(); 