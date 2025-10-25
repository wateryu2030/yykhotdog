const sql = require('mssql');
const config = {
  server: 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'hotdog2030',
  user: 'hotdog',
  password: 'Zhkj@62102218',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function testConnection() {
  try {
    console.log('正在连接数据库...');
    await sql.connect(config);
    console.log('数据库连接成功');
    
    const query = `
      SELECT 
        ForecastDate as date,
        PredictedValue as predictedSales,
        ActualValue as actualSales,
        ModelVersion,
        ConfidenceIntervalLower,
        ConfidenceIntervalUpper,
        Factors,
        Notes
      FROM PredictionResults
      WHERE StoreID = 35
        AND ForecastDate >= '2025-07-31'
        AND ForecastDate <= '2025-08-06'
        AND PredictionType = 'DailyTotalRevenue'
      ORDER BY ForecastDate
    `;

    console.log('执行查询:', query);
    const results = await sql.query(query);
    console.log('查询结果数量:', results.recordset.length);
    
    if (results.recordset.length > 0) {
      console.log('第一条记录:', JSON.stringify(results.recordset[0], null, 2));
    }
    
    await sql.close();
    console.log('数据库连接已关闭');
  } catch (err) {
    console.error('数据库连接错误:', err.message);
  }
}

testConnection(); 