// 全量同步 cyrg2025.dbo.OrderGoods 到 hotdog2030.dbo.order_goods
const sql = require('mssql');

const sourceConfig = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'cyrg2025',
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  options: { encrypt: false, trustServerCertificate: true }
};
const targetConfig = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'hotdog2030',
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  options: { encrypt: false, trustServerCertificate: true }
};

async function syncOrderGoods() {
  let sourcePool, targetPool;
  try {
    console.log('🚀 开始同步 OrderGoods...');
    sourcePool = await sql.connect(sourceConfig);
    targetPool = await sql.connect(targetConfig);
    await sourcePool.request().query('USE cyrg2025');
    await targetPool.request().query('USE hotdog2030');
    // 清空目标表
    await targetPool.request().query('DELETE FROM order_goods');
    console.log('✅ 目标表已清空');
    // 分批同步
    const batchSize = 1000;
    let offset = 0;
    let total = 0;
    while (true) {
      const result = await sourcePool.request().query(`
        SELECT TOP (${batchSize}) *
        FROM (
          SELECT *, ROW_NUMBER() OVER (ORDER BY id) AS rn FROM OrderGoods WHERE delflag = 0
        ) t
        WHERE rn > ${offset}
      `);
      const rows = result.recordset;
      if (rows.length === 0) break;
      // 构造批量插入
      const table = new sql.Table('order_goods');
      table.create = false;
      table.columns.add('id', sql.BigInt, { nullable: false });
      table.columns.add('orderId', sql.BigInt, { nullable: false });
      table.columns.add('categoryId', sql.Int, { nullable: true });
      table.columns.add('categoryName', sql.VarChar(150), { nullable: true });
      table.columns.add('goodsId', sql.Int, { nullable: true });
      table.columns.add('goodsName', sql.VarChar(150), { nullable: true });
      table.columns.add('goodsText', sql.VarChar(350), { nullable: true });
      table.columns.add('goodsNumber', sql.Int, { nullable: true });
      table.columns.add('goodsPrice', sql.Decimal(18,2), { nullable: true });
      table.columns.add('goodsTotal', sql.Decimal(18,2), { nullable: true });
      table.columns.add('orderScore', sql.Int, { nullable: true });
      table.columns.add('useScore', sql.Int, { nullable: true });
      table.columns.add('isRefund', sql.Int, { nullable: true });
      table.columns.add('refundMoney', sql.Decimal(18,2), { nullable: true });
      table.columns.add('refundScore', sql.Int, { nullable: true });
      table.columns.add('recordId', sql.Int, { nullable: true });
      table.columns.add('recordTime', sql.VarChar(50), { nullable: true });
      table.columns.add('delflag', sql.Int, { nullable: true });
      table.columns.add('shopId', sql.Int, { nullable: true });
      table.columns.add('shopName', sql.VarChar(150), { nullable: true });
      table.columns.add('standardPrice', sql.Decimal(18,2), { nullable: true });
      table.columns.add('standardTotal', sql.Decimal(18,2), { nullable: true });
      table.columns.add('otherTotal', sql.Decimal(18,2), { nullable: true });
      table.columns.add('isPackage', sql.Int, { nullable: true });
      table.columns.add('discountAmount', sql.Decimal(18,2), { nullable: true });
      table.columns.add('realIncomeAmount', sql.Decimal(18,2), { nullable: true });
      table.columns.add('costPrice', sql.Decimal(18,2), { nullable: true });
      table.columns.add('profitPrice', sql.Decimal(18,2), { nullable: true });
      // 批量加行
      for (const row of rows) {
        table.rows.add(
          row.id,
          row.orderId,
          row.categoryId,
          row.categoryName,
          row.goodsId,
          row.goodsName,
          row.goodsText,
          row.goodsNumber,
          row.goodsPrice,
          row.goodsTotal,
          row.orderScore,
          row.useScore,
          row.isRefund,
          row.refundMoney,
          row.refundScore,
          row.recordId,
          row.recordTime,
          row.delflag,
          row.shopId,
          row.shopName,
          row.standardPrice,
          row.standardTotal,
          row.otherTotal,
          row.isPackage,
          row.discountAmount,
          row.realIncomeAmount,
          row.costPrice,
          row.profitPrice
        );
      }
      await targetPool.request().bulk(table);
      total += rows.length;
      offset += batchSize;
      console.log(`✅ 已同步 ${total} 条商品明细`);
    }
    console.log('🎉 OrderGoods 全量同步完成');
    process.exit(0);
  } catch (err) {
    console.error('同步失败:', err);
    process.exit(1);
  }
}

syncOrderGoods(); 