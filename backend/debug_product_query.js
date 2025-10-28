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

async function debugProductQuery() {
  try {
    console.log('🔍 调试商品查询问题...');
    
    // 1. 检查order_items表结构
    console.log('📊 检查order_items表结构...');
    const columns = await sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'order_items' 
       ORDER BY ORDINAL_POSITION`,
      { type: QueryTypes.SELECT }
    );
    console.log('order_items表列:');
    columns.forEach(col => console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`));
    
    // 2. 检查orders表结构
    console.log('\n📊 检查orders表结构...');
    const orderColumns = await sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'orders' 
       ORDER BY ORDINAL_POSITION`,
      { type: QueryTypes.SELECT }
    );
    console.log('orders表列:');
    orderColumns.forEach(col => console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`));
    
    // 3. 检查数据样本
    console.log('\n📝 检查数据样本...');
    const sample = await sequelize.query(
      `SELECT TOP 3 oi.order_id, oi.product_name, o.created_at, o.delflag
       FROM order_items oi
       INNER JOIN orders o ON oi.order_id = o.id
       ORDER BY o.created_at DESC`,
      { type: QueryTypes.SELECT }
    );
    console.log('最新3条记录:');
    sample.forEach((item, i) => {
      console.log(`  ${i+1}. order_id: ${item.order_id}, product: ${item.product_name}, created_at: ${item.created_at}, delflag: ${item.delflag}`);
    });
    
    // 4. 检查日期范围
    console.log('\n📅 检查日期范围...');
    const dateRange = await sequelize.query(
      `SELECT 
         MIN(o.created_at) as min_date,
         MAX(o.created_at) as max_date,
         COUNT(*) as total_count
       FROM order_items oi
       INNER JOIN orders o ON oi.order_id = o.id
       WHERE o.delflag = 0`,
      { type: QueryTypes.SELECT }
    );
    console.log(`日期范围: ${dateRange[0].min_date} 到 ${dateRange[0].max_date}`);
    console.log(`总记录数: ${dateRange[0].total_count}`);
    
    // 5. 尝试简单的查询
    console.log('\n🧪 尝试简单查询...');
    const simpleQuery = `
      SELECT TOP 5
        oi.product_name,
        oi.product_category,
        SUM(oi.total_price) as total_sales,
        SUM(oi.quantity) as total_quantity
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.delflag = 0
      GROUP BY oi.product_name, oi.product_category
      ORDER BY total_sales DESC
    `;
    
    const simpleResult = await sequelize.query(simpleQuery, { type: QueryTypes.SELECT });
    console.log(`简单查询成功，返回 ${simpleResult.length} 条记录:`);
    simpleResult.forEach((item, i) => {
      console.log(`  ${i+1}. ${item.product_name}: ${item.total_sales}元, ${item.total_quantity}件`);
    });
    
    // 6. 尝试带日期的查询
    console.log('\n🧪 尝试带日期的查询...');
    const dateQuery = `
      SELECT TOP 5
        oi.product_name,
        oi.product_category,
        SUM(oi.total_price) as total_sales,
        SUM(oi.quantity) as total_quantity
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.delflag = 0
        AND o.created_at >= '2024-01-01'
        AND o.created_at <= '2024-12-31'
      GROUP BY oi.product_name, oi.product_category
      ORDER BY total_sales DESC
    `;
    
    const dateResult = await sequelize.query(dateQuery, { type: QueryTypes.SELECT });
    console.log(`带日期查询成功，返回 ${dateResult.length} 条记录:`);
    dateResult.forEach((item, i) => {
      console.log(`  ${i+1}. ${item.product_name}: ${item.total_sales}元, ${item.total_quantity}件`);
    });
    
  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  } finally {
    await sequelize.close();
  }
}

// 执行调试
debugProductQuery();
