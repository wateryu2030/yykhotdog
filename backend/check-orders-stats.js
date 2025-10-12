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

async function checkOrdersStats() {
  let sourcePool;
  
  try {
    console.log('🔍 检查Orders表统计信息...');
    
    // 连接源数据库
    console.log('📡 连接源数据库...');
    sourcePool = await sql.connect(sourceConfig);
    console.log('✅ 源数据库连接成功');
    
    // 确保使用正确的数据库上下文
    await sourcePool.request().query('USE cyrg2025');
    console.log('✅ 已切换到cyrg2025数据库');
    
    // 1. 检查总记录数
    console.log('\n📊 检查Orders表总记录数...');
    const totalResult = await sourcePool.request().query(`
      SELECT COUNT(*) as total_count
      FROM cyrg2025.dbo.Orders
    `);
    
    console.log(`📈 总记录数: ${totalResult.recordset[0].total_count.toLocaleString()}`);
    
    // 2. 检查各种过滤条件的影响
    console.log('\n🔍 检查各种过滤条件的影响...');
    
    // 检查openId不为空的记录
    const openIdResult = await sourcePool.request().query(`
      SELECT COUNT(*) as count_with_openid
      FROM cyrg2025.dbo.Orders 
      WHERE openId IS NOT NULL AND openId != ''
    `);
    
    // 检查total > 0的记录
    const totalPositiveResult = await sourcePool.request().query(`
      SELECT COUNT(*) as count_positive_total
      FROM cyrg2025.dbo.Orders 
      WHERE total > 0
    `);
    
    // 检查total < 100000的记录
    const totalReasonableResult = await sourcePool.request().query(`
      SELECT COUNT(*) as count_reasonable_total
      FROM cyrg2025.dbo.Orders 
      WHERE total < 100000
    `);
    
    // 检查recordTime不为空的记录
    const recordTimeResult = await sourcePool.request().query(`
      SELECT COUNT(*) as count_with_recordtime
      FROM cyrg2025.dbo.Orders 
      WHERE recordTime IS NOT NULL
    `);
    
    // 检查所有条件组合的记录
    const allConditionsResult = await sourcePool.request().query(`
      SELECT COUNT(*) as count_all_conditions
      FROM cyrg2025.dbo.Orders 
      WHERE openId IS NOT NULL 
        AND openId != ''
        AND total > 0
        AND total < 100000
        AND recordTime IS NOT NULL
    `);
    
    console.log(`📊 各条件统计:`);
    console.log(`   - openId不为空: ${openIdResult.recordset[0].count_with_openid.toLocaleString()}`);
    console.log(`   - total > 0: ${totalPositiveResult.recordset[0].count_positive_total.toLocaleString()}`);
    console.log(`   - total < 100000: ${totalReasonableResult.recordset[0].count_reasonable_total.toLocaleString()}`);
    console.log(`   - recordTime不为空: ${recordTimeResult.recordset[0].count_with_recordtime.toLocaleString()}`);
    console.log(`   - 所有条件组合: ${allConditionsResult.recordset[0].count_all_conditions.toLocaleString()}`);
    
    // 3. 检查金额统计
    console.log('\n💰 检查金额统计...');
    const amountResult = await sourcePool.request().query(`
      SELECT 
        SUM(total) as total_amount,
        AVG(total) as avg_amount,
        MIN(total) as min_amount,
        MAX(total) as max_amount,
        COUNT(*) as count_with_amount
      FROM cyrg2025.dbo.Orders 
      WHERE total > 0
    `);
    
    const amount = amountResult.recordset[0];
    console.log(`💰 金额统计 (total > 0):`);
    console.log(`   - 总金额: ${amount.total_amount.toLocaleString()} 元`);
    console.log(`   - 平均金额: ${amount.avg_amount.toFixed(2)} 元`);
    console.log(`   - 最小金额: ${amount.min_amount} 元`);
    console.log(`   - 最大金额: ${amount.max_amount} 元`);
    console.log(`   - 记录数: ${amount.count_with_amount.toLocaleString()}`);
    
    // 4. 检查一些异常数据
    console.log('\n⚠️ 检查异常数据...');
    const anomalyResult = await sourcePool.request().query(`
      SELECT 
        COUNT(*) as count_anomaly,
        SUM(total) as total_anomaly_amount
      FROM cyrg2025.dbo.Orders 
      WHERE total >= 100000 OR total <= 0
    `);
    
    const anomaly = anomalyResult.recordset[0];
    console.log(`⚠️ 异常数据 (total >= 100000 OR total <= 0):`);
    console.log(`   - 记录数: ${anomaly.count_anomaly.toLocaleString()}`);
    console.log(`   - 总金额: ${anomaly.total_anomaly_amount.toLocaleString()} 元`);
    
    // 5. 检查没有openId的记录
    const noOpenIdResult = await sourcePool.request().query(`
      SELECT COUNT(*) as count_no_openid
      FROM cyrg2025.dbo.Orders 
      WHERE openId IS NULL OR openId = ''
    `);
    
    console.log(`📱 没有openId的记录: ${noOpenIdResult.recordset[0].count_no_openid.toLocaleString()}`);
    
    console.log('\n✅ 统计检查完成');
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  } finally {
    if (sourcePool) await sourcePool.close();
  }
}

// 运行检查
checkOrdersStats()
  .then(() => {
    console.log('✅ 检查脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 检查脚本执行失败:', error);
    process.exit(1);
  }); 