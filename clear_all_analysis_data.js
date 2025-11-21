/**
 * 清空所有铺位分析数据
 * 将analysis_score、description等字段重置，并清空分析历史
 */

const path = require('path');
const fs = require('fs');

// 解析模块路径，确保能正确加载mssql
const backendNodeModules = path.resolve(__dirname, 'backend', 'node_modules');
const mssqlPath = path.join(backendNodeModules, 'mssql');

if (fs.existsSync(mssqlPath)) {
  // 将backend/node_modules添加到模块搜索路径
  const Module = require('module');
  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function(request, parent) {
    if (request === 'mssql') {
      return path.join(backendNodeModules, 'mssql', 'index.js');
    }
    return originalResolveFilename.apply(this, arguments);
  };
}

const sql = require('mssql');

// 数据库配置（从环境变量或配置文件读取）
const config = {
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME || 'hotdog2030',
  user: process.env.DB_USERNAME || process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true' || false,
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true' || true,
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 30000
  }
};

async function clearAnalysisData() {
  let pool;
  
  try {
    console.log('🔌 正在连接数据库...');
    pool = await sql.connect(config);
    console.log('✅ 数据库连接成功');
    
    console.log('\n📋 开始清空分析数据...\n');
    
    // 1. 清空分析历史表
    console.log('1️⃣ 清空 candidate_analysis_history 表...');
    const clearHistoryResult = await pool.request()
      .query(`
        DELETE FROM hotdog2030.dbo.candidate_analysis_history
        WHERE delflag = 0
      `);
    console.log(`   ✅ 已删除 ${clearHistoryResult.rowsAffected[0]} 条分析历史记录`);
    
    // 2. 重置 candidate_locations 表的分析字段
    console.log('\n2️⃣ 重置 candidate_locations 表的分析字段...');
    const resetResult = await pool.request()
      .query(`
        UPDATE hotdog2030.dbo.candidate_locations
        SET 
          analysis_score = NULL,
          description = NULL,
          poi_density_score = NULL,
          traffic_score = NULL,
          population_score = NULL,
          competition_score = NULL,
          rental_cost_score = NULL,
          predicted_revenue = NULL,
          predicted_orders = NULL,
          predicted_customers = NULL,
          confidence_score = NULL,
          success_probability = NULL,
          risk_level = NULL,
          status = 'pending',
          updated_at = GETDATE()
        WHERE delflag = 0
      `);
    console.log(`   ✅ 已重置 ${resetResult.rowsAffected[0]} 条铺位记录的分析数据`);
    
    // 3. 统计清空后的数据
    console.log('\n3️⃣ 统计清空后的数据...');
    const statsResult = await pool.request()
      .query(`
        SELECT 
          COUNT(*) as total_count,
          COUNT(CASE WHEN analysis_score IS NOT NULL THEN 1 END) as analyzed_count,
          COUNT(CASE WHEN analysis_score IS NULL THEN 1 END) as pending_count
        FROM hotdog2030.dbo.candidate_locations
        WHERE delflag = 0
      `);
    
    const stats = statsResult.recordset[0];
    console.log(`   📊 总铺位数: ${stats.total_count}`);
    console.log(`   ✅ 已分析: ${stats.analyzed_count}`);
    console.log(`   ⏳ 待分析: ${stats.pending_count}`);
    
    // 4. 检查分析历史表
    const historyStatsResult = await pool.request()
      .query(`
        SELECT COUNT(*) as history_count
        FROM hotdog2030.dbo.candidate_analysis_history
        WHERE delflag = 0
      `);
    
    console.log(`   📜 分析历史记录: ${historyStatsResult.recordset[0].history_count}`);
    
    console.log('\n🎉 所有分析数据已清空！');
    console.log('   💡 现在可以重新进行AI分析了。\n');
    
  } catch (error) {
    console.error('❌ 清空分析数据失败:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 执行清空操作
clearAnalysisData()
  .then(() => {
    console.log('✅ 脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });

