const { Sequelize, QueryTypes } = require('sequelize');

// 数据库连接配置
const sequelize = new Sequelize({
  dialect: 'mssql',
  host: 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: 1433,
  username: 'hotdog',
  password: 'Zhkj@62102218',
  database: 'hotdog2030',
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  },
});

async function fixProductQuery() {
  try {
    console.log('🔧 修复商品查询...');
    
    // 检查products表结构
    console.log('📊 检查products表结构...');
    const productColumns = await sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'products' 
       ORDER BY ORDINAL_POSITION`,
      { type: QueryTypes.SELECT }
    );
    console.log('products表列:');
    productColumns.forEach(col => console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`));
    
    // 修复后的查询 - 不使用product_category
    console.log('\n🧪 测试修复后的查询...');
    const fixedQuery = `
      SELECT TOP 10
        oi.product_name,
        COUNT(DISTINCT o.store_id) as store_count,
        SUM(oi.total_price) as total_sales,
        SUM(oi.quantity) as total_quantity,
        COUNT(DISTINCT o.id) as order_count
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.delflag = 0
        AND o.created_at >= '2024-10-01'
        AND o.created_at <= '2024-10-31'
      GROUP BY oi.product_name
      ORDER BY total_sales DESC
    `;
    
    const result = await sequelize.query(fixedQuery, { type: QueryTypes.SELECT });
    console.log(`✅ 修复后的查询成功，返回 ${result.length} 条记录:`);
    result.forEach((item, i) => {
      console.log(`  ${i+1}. ${item.product_name}: ${item.total_sales}元, ${item.total_quantity}件, ${item.store_count}个门店`);
    });
    
    // 测试带参数的查询
    console.log('\n🧪 测试带参数的查询...');
    const paramQuery = `
      SELECT TOP 5
        oi.product_name,
        COUNT(DISTINCT o.store_id) as store_count,
        SUM(oi.total_price) as total_sales,
        SUM(oi.quantity) as total_quantity,
        COUNT(DISTINCT o.id) as order_count
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.delflag = 0
        AND o.created_at >= :startDate
        AND o.created_at <= :endDate
      GROUP BY oi.product_name
      ORDER BY total_sales DESC
    `;
    
    const paramResult = await sequelize.query(paramQuery, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate: '2024-10-01',
        endDate: '2024-10-31'
      }
    });
    console.log(`✅ 带参数查询成功，返回 ${paramResult.length} 条记录:`);
    paramResult.forEach((item, i) => {
      console.log(`  ${i+1}. ${item.product_name}: ${item.total_sales}元, ${item.total_quantity}件`);
    });
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  } finally {
    await sequelize.close();
  }
}

// 执行修复
fixProductQuery();
