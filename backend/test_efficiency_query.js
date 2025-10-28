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

async function testEfficiencyQuery() {
  try {
    console.log('🧪 测试效率对比SQL查询...');
    
    const startDate = '2024-10-01';
    const endDate = '2024-10-31';
    
    // 测试stores表结构
    console.log('📊 检查stores表结构...');
    const storeColumns = await sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'stores' 
       ORDER BY ORDINAL_POSITION`,
      { type: QueryTypes.SELECT }
    );
    console.log('stores表列:');
    storeColumns.forEach(col => console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`));
    
    // 测试简单的stores查询
    console.log('\n🧪 测试简单stores查询...');
    const simpleStoresQuery = `
      SELECT TOP 5
        s.id as store_id,
        s.store_name,
        s.city,
        s.district,
        s.area_size,
        5 as staff_count
      FROM stores s
      WHERE s.delflag = 0
    `;
    
    const simpleResult = await sequelize.query(simpleStoresQuery, { type: QueryTypes.SELECT });
    console.log(`简单查询成功，返回 ${simpleResult.length} 条记录:`);
    simpleResult.forEach((store, i) => {
      console.log(`  ${i+1}. ${store.store_name} (${store.city}): 面积=${store.area_size}, 员工=${store.staff_count}`);
    });
    
    // 测试带ISNULL的查询
    console.log('\n🧪 测试带ISNULL的查询...');
    const isnullQuery = `
      SELECT TOP 5
        s.id as store_id,
        s.store_name,
        s.city,
        s.district,
        ISNULL(s.area_size, 0) as store_area,
        5 as staff_count
      FROM stores s
      WHERE s.delflag = 0
    `;
    
    const isnullResult = await sequelize.query(isnullQuery, { type: QueryTypes.SELECT });
    console.log(`ISNULL查询成功，返回 ${isnullResult.length} 条记录:`);
    isnullResult.forEach((store, i) => {
      console.log(`  ${i+1}. ${store.store_name}: 面积=${store.store_area}, 员工=${store.staff_count}`);
    });
    
    // 测试完整的效率查询
    console.log('\n🧪 测试完整的效率查询...');
    const efficiencyQuery = `
      SELECT 
        s.id as store_id,
        s.store_name,
        s.city,
        s.district,
        ISNULL(s.area_size, 0) as store_area,
        5 as staff_count,
        SUM(ISNULL(o.total_amount, 0)) as total_sales,
        COUNT(o.id) as total_orders
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id 
        AND o.delflag = 0
        AND o.created_at >= :startDate
        AND o.created_at <= :endDate
      WHERE s.delflag = 0
      GROUP BY s.id, s.store_name, s.city, s.district, s.area_size
      ORDER BY total_sales DESC
    `;
    
    const efficiencyResult = await sequelize.query(efficiencyQuery, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate: startDate,
        endDate: endDate
      }
    });
    
    console.log(`✅ 效率查询成功，返回 ${efficiencyResult.length} 条记录:`);
    efficiencyResult.forEach((store, i) => {
      console.log(`  ${i+1}. ${store.store_name} (${store.city}): 销售=${store.total_sales}元, 订单=${store.total_orders}个`);
    });
    
  } catch (error) {
    console.error('❌ 效率查询测试失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await sequelize.close();
  }
}

// 执行测试
testEfficiencyQuery();
