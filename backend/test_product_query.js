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

async function testProductComparisonQuery() {
  try {
    console.log('🧪 测试商品对比SQL查询...');
    
    const startDate = '2025-10-19';
    const endDate = '2025-10-26';
    
    const productComparisonQuery = `
      SELECT 
        oi.product_name,
        oi.product_category,
        COUNT(DISTINCT o.store_id) as store_count,
        SUM(ISNULL(oi.total_price, 0)) as total_sales,
        SUM(ISNULL(oi.quantity, 0)) as total_quantity,
        COUNT(DISTINCT o.id) as order_count
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.delflag = 0
        AND CAST(o.created_at AS DATE) BETWEEN :startDate AND :endDate
      GROUP BY oi.product_name, oi.product_category
      ORDER BY total_sales DESC
    `;
    
    console.log('📊 执行SQL查询...');
    const result = await sequelize.query(productComparisonQuery, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate: startDate,
        endDate: endDate,
      },
    });
    
    console.log(`✅ 查询成功，返回 ${result.length} 条记录`);
    
    if (result.length > 0) {
      console.log('📝 前5条记录:');
      result.slice(0, 5).forEach((item, i) => {
        console.log(`  ${i+1}. ${item.product_name} (${item.product_category}): ${item.total_sales}元, ${item.total_quantity}件`);
      });
    } else {
      console.log('⚠️ 查询结果为空，可能是指定日期范围内没有数据');
      
      // 检查是否有任何数据
      const anyDataQuery = `
        SELECT COUNT(*) as count
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE o.delflag = 0
      `;
      const anyDataResult = await sequelize.query(anyDataQuery, { type: QueryTypes.SELECT });
      console.log(`📊 总的有效订单商品记录数: ${anyDataResult[0].count}`);
      
      // 检查日期范围
      const dateRangeQuery = `
        SELECT 
          MIN(CAST(o.created_at AS DATE)) as min_date,
          MAX(CAST(o.created_at AS DATE)) as max_date
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE o.delflag = 0
      `;
      const dateRangeResult = await sequelize.query(dateRangeQuery, { type: QueryTypes.SELECT });
      console.log(`📅 数据日期范围: ${dateRangeResult[0].min_date} 到 ${dateRangeResult[0].max_date}`);
    }
    
  } catch (error) {
    console.error('❌ SQL查询测试失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await sequelize.close();
  }
}

// 执行测试
testProductComparisonQuery();
