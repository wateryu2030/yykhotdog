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

async function checkDatabaseStatus() {
  try {
    console.log('🔍 检查hotdog2030数据库状态...');
    
    // 检查所有表
    const tables = await sequelize.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
      { type: QueryTypes.SELECT }
    );
    
    console.log(`📋 数据库中的表 (${tables.length} 个):`);
    tables.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}`);
    });
    
    // 检查关键表的数据量
    const keyTables = ['orders', 'order_items', 'stores', 'products', 'customers'];
    
    console.log('\n📊 关键表数据量:');
    for (const tableName of keyTables) {
      try {
        const result = await sequelize.query(
          `SELECT COUNT(*) as count FROM ${tableName}`,
          { type: QueryTypes.SELECT }
        );
        const count = result[0].count;
        console.log(`  - ${tableName}: ${count} 条记录`);
        
        // 检查order_items表的详细信息
        if (tableName === 'order_items' && count > 0) {
          const sample = await sequelize.query(
            'SELECT TOP 3 order_id, product_name, quantity, total_price FROM order_items ORDER BY created_at DESC',
            { type: QueryTypes.SELECT }
          );
          console.log(`    📝 最新3条记录:`);
          sample.forEach((item, i) => {
            console.log(`      ${i+1}. order_id: ${item.order_id}, product: ${item.product_name}, qty: ${item.quantity}`);
          });
        }
      } catch (error) {
        console.log(`  - ${tableName}: 表不存在或查询失败`);
      }
    }
    
    // 检查数据同步完整性
    console.log('\n🔄 数据同步完整性检查:');
    
    // 检查orders表
    const ordersCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM orders WHERE delflag = 0',
      { type: QueryTypes.SELECT }
    );
    console.log(`  - orders表 (delflag=0): ${ordersCount[0].count} 条记录`);
    
    // 检查order_items表
    try {
      const orderItemsCount = await sequelize.query(
        'SELECT COUNT(*) as count FROM order_items',
        { type: QueryTypes.SELECT }
      );
      console.log(`  - order_items表: ${orderItemsCount[0].count} 条记录`);
      
      if (orderItemsCount[0].count === 0) {
        console.log('  ⚠️ order_items表为空，需要执行数据同步');
      }
    } catch (error) {
      console.log('  ❌ order_items表不存在，需要创建表并同步数据');
    }
    
    // 检查stores表
    const storesCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM stores WHERE delflag = 0',
      { type: QueryTypes.SELECT }
    );
    console.log(`  - stores表 (delflag=0): ${storesCount[0].count} 条记录`);
    
    // 检查数据关联性
    console.log('\n🔗 数据关联性检查:');
    
    try {
      const orderItemsWithOrders = await sequelize.query(
        `SELECT COUNT(*) as count 
         FROM order_items oi 
         INNER JOIN orders o ON oi.order_id = o.id 
         WHERE o.delflag = 0`,
        { type: QueryTypes.SELECT }
      );
      console.log(`  - order_items与orders关联记录: ${orderItemsWithOrders[0].count} 条`);
    } catch (error) {
      console.log('  ❌ 无法检查order_items与orders的关联性');
    }
    
    console.log('\n✅ 数据库状态检查完成');
    
  } catch (error) {
    console.error('❌ 数据库检查失败:', error.message);
  } finally {
    await sequelize.close();
  }
}

// 执行检查
checkDatabaseStatus();
