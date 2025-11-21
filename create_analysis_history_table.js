/**
 * 创建铺位分析历史表
 * 自动执行SQL脚本创建candidate_analysis_history表
 */

const path = require('path');
const fs = require('fs');
const { readFileSync } = require('fs');

// 解析模块路径，确保能正确加载mssql
const backendNodeModules = path.resolve(__dirname, 'backend', 'node_modules');
const mssqlPath = path.join(backendNodeModules, 'mssql');

if (fs.existsSync(mssqlPath)) {
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

async function createAnalysisHistoryTable() {
  let pool;
  
  try {
    console.log('🔌 正在连接数据库...');
    pool = await sql.connect(config);
    console.log('✅ 数据库连接成功');
    
    console.log('\n📋 开始创建分析历史表...\n');
    
    // 读取SQL脚本
    const sqlFile = path.join(__dirname, 'database', 'create_analysis_history_table.sql');
    let sqlScript = readFileSync(sqlFile, 'utf8');
    
    // 移除GO语句（mssql不支持），分割成多个查询
    const queries = sqlScript
      .split(/GO\s*/gi)
      .map(q => q.trim())
      .filter(q => q.length > 0);
    
    // 执行每个查询
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      if (query.length === 0) continue;
      
      try {
        // 跳过USE语句，因为连接时已经指定了数据库
        if (query.trim().toUpperCase().startsWith('USE ')) {
          console.log(`   ⏭️  跳过 USE 语句`);
          continue;
        }
        
        const result = await pool.request().query(query);
        
        // 检查是否有PRINT消息
        if (result.messages && result.messages.length > 0) {
          result.messages.forEach(msg => {
            if (msg.message) {
              console.log(`   ${msg.message}`);
            }
          });
        }
        
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
          console.log(`   ✅ 查询执行成功，影响 ${result.rowsAffected[0]} 行`);
        }
      } catch (queryError) {
        // 某些错误可以忽略（如表已存在）
        if (queryError.message && (
          queryError.message.includes('already exists') ||
          queryError.message.includes('已存在') ||
          queryError.message.includes('There is already')
        )) {
          console.log(`   ℹ️  ${queryError.message}`);
        } else {
          throw queryError;
        }
      }
    }
    
    // 验证表是否创建成功
    console.log('\n🔍 验证表是否创建成功...');
    const checkResult = await pool.request()
      .query(`
        SELECT 
          t.name AS table_name,
          COUNT(c.name) AS column_count
        FROM sys.tables t
        LEFT JOIN sys.columns c ON t.object_id = c.object_id
        WHERE t.name = 'candidate_analysis_history'
        GROUP BY t.name
      `);
    
    if (checkResult.recordset.length > 0) {
      const tableInfo = checkResult.recordset[0];
      console.log(`   ✅ 表 ${tableInfo.table_name} 创建成功，包含 ${tableInfo.column_count} 个字段`);
    } else {
      console.log('   ⚠️  警告：未找到 candidate_analysis_history 表');
    }
    
    // 检查触发器
    const triggerCheck = await pool.request()
      .query(`
        SELECT name 
        FROM sys.triggers 
        WHERE name = 'tr_candidate_analysis_history_update'
      `);
    
    if (triggerCheck.recordset.length > 0) {
      console.log(`   ✅ 触发器创建成功`);
    }
    
    console.log('\n🎉 分析历史表创建完成！\n');
    
  } catch (error) {
    console.error('❌ 创建分析历史表失败:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 执行创建操作
createAnalysisHistoryTable()
  .then(() => {
    console.log('✅ 脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });

