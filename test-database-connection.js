const sql = require('mssql');

const config = {
  server: 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: 1433,
  user: 'hotdog',
  password: 'Zhkj@62102218',
  database: 'cyrg2025', // 先测试cyrg2025数据库
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function testDatabaseConnection() {
  try {
    console.log('=== 测试数据库连接 ===');
    console.log('连接配置:', {
      server: config.server,
      port: config.port,
      user: config.user,
      database: config.database
    });

    // 连接cyrg2025数据库
    const pool = await sql.connect(config);
    console.log('✅ cyrg2025数据库连接成功');

    // 测试查询cyrg2025数据库
    const cyrg2025Result = await pool.request().query(`
      SELECT TOP 5 
        o.shopId,
        CAST(o.recordTime AS DATE) as saleDate,
        COUNT(DISTINCT o.id) as orderCount,
        SUM(CASE WHEN o.cash > 0 THEN o.cash ELSE o.total END) as totalSales
      FROM cyrg2025.dbo.Orders o
      WHERE (o.payState = 2 OR o.payState IS NULL)
        AND (o.delflag = 0 OR o.delflag IS NULL)
      GROUP BY o.shopId, CAST(o.recordTime AS DATE)
      ORDER BY saleDate DESC
    `);
    console.log('✅ cyrg2025数据库查询成功，记录数:', cyrg2025Result.recordset.length);
    console.log('cyrg2025数据示例:', cyrg2025Result.recordset);

    // 检查2025-07-18的数据
    const dateCheckResult = await pool.request().query(`
      SELECT 
        o.shopId,
        CAST(o.recordTime AS DATE) as saleDate,
        DATEPART(HOUR, CAST(o.recordTime AS DATETIME)) as hour,
        COUNT(DISTINCT o.id) as orders,
        SUM(CASE WHEN o.cash > 0 THEN o.cash ELSE o.total END) as sales
      FROM cyrg2025.dbo.Orders o
      WHERE CAST(o.recordTime AS DATE) = '2025-07-18'
        AND (o.payState = 2 OR o.payState IS NULL)
        AND (o.delflag = 0 OR o.delflag IS NULL)
      GROUP BY o.shopId, CAST(o.recordTime AS DATE), DATEPART(HOUR, CAST(o.recordTime AS DATETIME))
      ORDER BY o.shopId, hour
    `);
    console.log('✅ 2025-07-18数据查询成功，记录数:', dateCheckResult.recordset.length);
    if (dateCheckResult.recordset.length > 0) {
      console.log('2025-07-18数据示例:', dateCheckResult.recordset);
    } else {
      console.log('⚠️ 2025-07-18没有实际销售数据');
    }

    // 检查最近的销售数据日期
    const recentDateResult = await pool.request().query(`
      SELECT TOP 10
        CAST(o.recordTime AS DATE) as saleDate,
        COUNT(DISTINCT o.id) as orderCount,
        SUM(CASE WHEN o.cash > 0 THEN o.cash ELSE o.total END) as totalSales
      FROM cyrg2025.dbo.Orders o
      WHERE (o.payState = 2 OR o.payState IS NULL)
        AND (o.delflag = 0 OR o.delflag IS NULL)
      GROUP BY CAST(o.recordTime AS DATE)
      ORDER BY saleDate DESC
    `);
    console.log('✅ 最近销售数据查询成功，记录数:', recentDateResult.recordset.length);
    console.log('最近销售数据日期:', recentDateResult.recordset.map(r => r.saleDate));

    // 切换到hotdog2030数据库
    config.database = 'hotdog2030';
    await pool.close();
    const pool2 = await sql.connect(config);
    console.log('✅ hotdog2030数据库连接成功');

    // 测试查询hotdog2030数据库
    const hotdogResult = await pool2.request().query(`
      SELECT TOP 5 
        storeId,
        date,
        hour,
        predictedSales,
        predictedOrders,
        confidence
      FROM hotdog2030.dbo.sales_predictions
      ORDER BY date DESC, hour
    `);
    console.log('✅ hotdog2030数据库查询成功，记录数:', hotdogResult.recordset.length);
    console.log('hotdog2030数据示例:', hotdogResult.recordset);

    // 检查2025-07-18的预测数据
    const predictionCheckResult = await pool2.request().query(`
      SELECT 
        storeId,
        date,
        hour,
        predictedSales,
        predictedOrders,
        confidence
      FROM hotdog2030.dbo.sales_predictions
      WHERE date = '2025-07-18'
      ORDER BY storeId, hour
    `);
    console.log('✅ 2025-07-18预测数据查询成功，记录数:', predictionCheckResult.recordset.length);
    if (predictionCheckResult.recordset.length > 0) {
      console.log('2025-07-18预测数据示例:', predictionCheckResult.recordset);
    } else {
      console.log('⚠️ 2025-07-18没有预测数据');
    }

    // 测试跨数据库查询
    await pool2.close();
    config.database = 'cyrg2025';
    const pool3 = await sql.connect(config);
    
    const crossDbResult = await pool3.request().query(`
      SELECT 
        'cyrg2025' as db_name,
        COUNT(*) as order_count
      FROM cyrg2025.dbo.Orders
      UNION ALL
      SELECT 
        'hotdog2030' as db_name,
        COUNT(*) as order_count
      FROM hotdog2030.dbo.sales_predictions
    `);
    console.log('✅ 跨数据库查询成功:', crossDbResult.recordset);

    await pool3.close();
    console.log('✅ 数据库连接测试完成');

  } catch (error) {
    console.error('❌ 数据库连接测试失败:', error);
  }
}

testDatabaseConnection(); 