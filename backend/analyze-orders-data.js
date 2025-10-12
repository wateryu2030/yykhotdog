const sql = require('mssql');
require('dotenv').config();

const sourceConfig = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'cyrg2025',
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function analyzeOrdersData() {
  let sourcePool;
  
  try {
    console.log('🔍 深入分析Orders表数据...');
    
    // 连接源数据库
    console.log('📡 连接源数据库...');
    sourcePool = await sql.connect(sourceConfig);
    console.log('✅ 源数据库连接成功');
    
    // 确保使用正确的数据库上下文
    await sourcePool.request().query('USE cyrg2025');
    console.log('✅ 已切换到cyrg2025数据库');
    
    // 1. 分析total字段的分布
    console.log('\n💰 分析total字段分布...');
    const totalDistributionResult = await sourcePool.request().query(`
      SELECT 
        CASE 
          WHEN total = 0 THEN 'total = 0'
          WHEN total < 0 THEN 'total < 0'
          WHEN total BETWEEN 0.01 AND 10 THEN '0.01-10'
          WHEN total BETWEEN 10.01 AND 50 THEN '10.01-50'
          WHEN total BETWEEN 50.01 AND 100 THEN '50.01-100'
          WHEN total BETWEEN 100.01 AND 500 THEN '100.01-500'
          WHEN total BETWEEN 500.01 AND 1000 THEN '500.01-1000'
          WHEN total BETWEEN 1000.01 AND 10000 THEN '1000.01-10000'
          WHEN total BETWEEN 10000.01 AND 100000 THEN '10000.01-100000'
          WHEN total >= 100000 THEN '>= 100000'
          ELSE '其他'
        END as amount_range,
        COUNT(*) as count,
        SUM(total) as total_amount
      FROM cyrg2025.dbo.Orders
      GROUP BY 
        CASE 
          WHEN total = 0 THEN 'total = 0'
          WHEN total < 0 THEN 'total < 0'
          WHEN total BETWEEN 0.01 AND 10 THEN '0.01-10'
          WHEN total BETWEEN 10.01 AND 50 THEN '10.01-50'
          WHEN total BETWEEN 50.01 AND 100 THEN '50.01-100'
          WHEN total BETWEEN 100.01 AND 500 THEN '100.01-500'
          WHEN total BETWEEN 500.01 AND 1000 THEN '500.01-1000'
          WHEN total BETWEEN 1000.01 AND 10000 THEN '1000.01-10000'
          WHEN total BETWEEN 10000.01 AND 100000 THEN '10000.01-100000'
          WHEN total >= 100000 THEN '>= 100000'
          ELSE '其他'
        END
      ORDER BY 
        CASE amount_range
          WHEN 'total < 0' THEN 1
          WHEN 'total = 0' THEN 2
          WHEN '0.01-10' THEN 3
          WHEN '10.01-50' THEN 4
          WHEN '50.01-100' THEN 5
          WHEN '100.01-500' THEN 6
          WHEN '500.01-1000' THEN 7
          WHEN '1000.01-10000' THEN 8
          WHEN '10000.01-100000' THEN 9
          WHEN '>= 100000' THEN 10
          ELSE 11
        END
    `);
    
    console.log('💰 total字段分布:');
    totalDistributionResult.recordset.forEach(row => {
      console.log(`   ${row.amount_range}: ${row.count.toLocaleString()} 条, 总金额: ${row.total_amount.toLocaleString()} 元`);
    });
    
    // 2. 分析openId字段
    console.log('\n📱 分析openId字段...');
    const openIdAnalysisResult = await sourcePool.request().query(`
      SELECT 
        CASE 
          WHEN openId IS NULL THEN 'openId IS NULL'
          WHEN openId = '' THEN 'openId = ""'
          WHEN LEN(openId) < 10 THEN 'openId长度<10'
          ELSE 'openId正常'
        END as openid_status,
        COUNT(*) as count,
        SUM(CASE WHEN total > 0 THEN total ELSE 0 END) as total_amount
      FROM cyrg2025.dbo.Orders
      GROUP BY 
        CASE 
          WHEN openId IS NULL THEN 'openId IS NULL'
          WHEN openId = '' THEN 'openId = ""'
          WHEN LEN(openId) < 10 THEN 'openId长度<10'
          ELSE 'openId正常'
        END
    `);
    
    console.log('📱 openId字段分析:');
    openIdAnalysisResult.recordset.forEach(row => {
      console.log(`   ${row.openid_status}: ${row.count.toLocaleString()} 条, 有效金额: ${row.total_amount.toLocaleString()} 元`);
    });
    
    // 3. 分析payState字段
    console.log('\n💳 分析payState字段...');
    const payStateResult = await sourcePool.request().query(`
      SELECT 
        payState,
        COUNT(*) as count,
        SUM(CASE WHEN total > 0 THEN total ELSE 0 END) as total_amount
      FROM cyrg2025.dbo.Orders
      GROUP BY payState
      ORDER BY payState
    `);
    
    console.log('💳 payState字段分析:');
    payStateResult.recordset.forEach(row => {
      console.log(`   payState=${row.payState}: ${row.count.toLocaleString()} 条, 有效金额: ${row.total_amount.toLocaleString()} 元`);
    });
    
    // 4. 分析有效订单（有openId且total>0）
    console.log('\n✅ 分析有效订单...');
    const validOrdersResult = await sourcePool.request().query(`
      SELECT 
        COUNT(*) as valid_count,
        COUNT(DISTINCT openId) as unique_customers,
        SUM(total) as total_amount,
        AVG(total) as avg_amount
      FROM cyrg2025.dbo.Orders 
      WHERE openId IS NOT NULL 
        AND openId != ''
        AND total > 0
    `);
    
    const valid = validOrdersResult.recordset[0];
    console.log('✅ 有效订单统计:');
    console.log(`   - 有效订单数: ${valid.valid_count.toLocaleString()}`);
    console.log(`   - 唯一客户数: ${valid.unique_customers.toLocaleString()}`);
    console.log(`   - 总金额: ${valid.total_amount.toLocaleString()} 元`);
    console.log(`   - 平均订单金额: ${valid.avg_amount.toFixed(2)} 元`);
    
    // 5. 检查一些样本数据
    console.log('\n📋 检查样本数据...');
    const sampleResult = await sourcePool.request().query(`
      SELECT TOP 10
        id, openId, total, payState, recordTime, orderNo
      FROM cyrg2025.dbo.Orders 
      WHERE openId IS NOT NULL 
        AND openId != ''
        AND total > 0
      ORDER BY recordTime DESC
    `);
    
    console.log('📋 最近10个有效订单样本:');
    sampleResult.recordset.forEach((row, index) => {
      console.log(`   ${index + 1}. ID: ${row.id}, openId: ${row.openId}, 金额: ${row.total}, 支付状态: ${row.payState}, 时间: ${row.recordTime}`);
    });
    
    console.log('\n✅ 数据分析完成');
    
  } catch (error) {
    console.error('❌ 分析失败:', error);
    throw error;
  } finally {
    if (sourcePool) await sourcePool.close();
  }
}

// 运行分析
analyzeOrdersData()
  .then(() => {
    console.log('✅ 分析脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 分析脚本执行失败:', error);
    process.exit(1);
  }); 