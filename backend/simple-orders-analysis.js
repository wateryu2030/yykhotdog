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

async function simpleOrdersAnalysis() {
  let sourcePool;
  
  try {
    console.log('🔍 简化分析Orders表数据...');
    
    // 连接源数据库
    console.log('📡 连接源数据库...');
    sourcePool = await sql.connect(sourceConfig);
    console.log('✅ 源数据库连接成功');
    
    // 确保使用正确的数据库上下文
    await sourcePool.request().query('USE cyrg2025');
    console.log('✅ 已切换到cyrg2025数据库');
    
    // 1. 基本统计
    console.log('\n📊 基本统计...');
    const basicStats = await sourcePool.request().query(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN total > 0 THEN total ELSE 0 END) as total_amount,
        COUNT(CASE WHEN openId IS NOT NULL AND openId != '' THEN 1 END) as count_with_openid,
        COUNT(CASE WHEN total > 0 THEN 1 END) as count_positive_total,
        COUNT(CASE WHEN total = 0 THEN 1 END) as count_zero_total,
        COUNT(CASE WHEN total < 0 THEN 1 END) as count_negative_total
      FROM cyrg2025.dbo.Orders
    `);
    
    const stats = basicStats.recordset[0];
    console.log(`📈 基本统计:`);
    console.log(`   - 总记录数: ${stats.total_count.toLocaleString()}`);
    console.log(`   - 总金额 (total > 0): ${stats.total_amount.toLocaleString()} 元`);
    console.log(`   - 有openId的记录: ${stats.count_with_openid.toLocaleString()}`);
    console.log(`   - total > 0的记录: ${stats.count_positive_total.toLocaleString()}`);
    console.log(`   - total = 0的记录: ${stats.count_zero_total.toLocaleString()}`);
    console.log(`   - total < 0的记录: ${stats.count_negative_total.toLocaleString()}`);
    
    // 2. 有效订单统计（有openId且total>0）
    console.log('\n✅ 有效订单统计...');
    const validOrders = await sourcePool.request().query(`
      SELECT 
        COUNT(*) as valid_count,
        COUNT(DISTINCT openId) as unique_customers,
        SUM(total) as total_amount,
        AVG(total) as avg_amount,
        MIN(total) as min_amount,
        MAX(total) as max_amount
      FROM cyrg2025.dbo.Orders 
      WHERE openId IS NOT NULL 
        AND openId != ''
        AND total > 0
    `);
    
    const valid = validOrders.recordset[0];
    console.log(`✅ 有效订单统计 (有openId且total>0):`);
    console.log(`   - 有效订单数: ${valid.valid_count.toLocaleString()}`);
    console.log(`   - 唯一客户数: ${valid.unique_customers.toLocaleString()}`);
    console.log(`   - 总金额: ${valid.total_amount.toLocaleString()} 元`);
    console.log(`   - 平均订单金额: ${valid.avg_amount.toFixed(2)} 元`);
    console.log(`   - 最小订单金额: ${valid.min_amount} 元`);
    console.log(`   - 最大订单金额: ${valid.max_amount} 元`);
    
    // 3. 检查payState分布
    console.log('\n💳 支付状态分布...');
    const payStateStats = await sourcePool.request().query(`
      SELECT 
        payState,
        COUNT(*) as count,
        SUM(CASE WHEN total > 0 THEN total ELSE 0 END) as total_amount
      FROM cyrg2025.dbo.Orders
      WHERE openId IS NOT NULL AND openId != '' AND total > 0
      GROUP BY payState
      ORDER BY payState
    `);
    
    console.log(`💳 支付状态分布 (有效订单):`);
    payStateStats.recordset.forEach(row => {
      console.log(`   payState=${row.payState}: ${row.count.toLocaleString()} 条, 金额: ${row.total_amount.toLocaleString()} 元`);
    });
    
    // 4. 检查一些样本数据
    console.log('\n📋 检查样本数据...');
    const samples = await sourcePool.request().query(`
      SELECT TOP 5
        id, openId, total, payState, recordTime, orderNo
      FROM cyrg2025.dbo.Orders 
      WHERE openId IS NOT NULL 
        AND openId != ''
        AND total > 0
      ORDER BY recordTime DESC
    `);
    
    console.log(`📋 最近5个有效订单样本:`);
    samples.recordset.forEach((row, index) => {
      console.log(`   ${index + 1}. ID: ${row.id}, openId: ${row.openId}, 金额: ${row.total}, 支付状态: ${row.payState}, 时间: ${row.recordTime}`);
    });
    
    // 5. 检查异常数据样本
    console.log('\n⚠️ 检查异常数据样本...');
    const anomalies = await sourcePool.request().query(`
      SELECT TOP 5
        id, openId, total, payState, recordTime, orderNo
      FROM cyrg2025.dbo.Orders 
      WHERE (openId IS NULL OR openId = '') OR total <= 0
      ORDER BY id DESC
    `);
    
    console.log(`⚠️ 异常数据样本 (无openId或金额<=0):`);
    anomalies.recordset.forEach((row, index) => {
      console.log(`   ${index + 1}. ID: ${row.id}, openId: ${row.openId || 'NULL'}, 金额: ${row.total}, 支付状态: ${row.payState}, 时间: ${row.recordTime}`);
    });
    
    console.log('\n✅ 简化分析完成');
    
  } catch (error) {
    console.error('❌ 分析失败:', error);
    throw error;
  } finally {
    if (sourcePool) await sourcePool.close();
  }
}

// 运行分析
simpleOrdersAnalysis()
  .then(() => {
    console.log('✅ 分析脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 分析脚本执行失败:', error);
    process.exit(1);
  }); 