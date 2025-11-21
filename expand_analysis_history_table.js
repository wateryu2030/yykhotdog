/**
 * 扩展铺位分析历史表
 * 添加字段以支持保存完整的AI分析数据
 */

const path = require('path');
const fs = require('fs');

// 加载环境变量（手动读取）
const envPath = path.join(__dirname, 'dev.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

// 加载mssql模块（从backend/node_modules）
const backendNodeModules = path.join(__dirname, 'backend', 'node_modules');
const mssqlPath = path.join(backendNodeModules, 'mssql');
let sql;

if (fs.existsSync(mssqlPath)) {
  // 修改模块解析路径
  const Module = require('module');
  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function(request, parent, isMain, options) {
    if (request === 'mssql') {
      return mssqlPath;
    }
    if (request === 'dotenv') {
      const dotenvPath = path.join(backendNodeModules, 'dotenv');
      if (fs.existsSync(dotenvPath)) {
        return dotenvPath;
      }
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };
  sql = require(mssqlPath);
} else {
  // 尝试正常加载
  sql = require('mssql');
}

async function expandAnalysisHistoryTable() {
  let pool = null;
  
  try {
    console.log('📋 开始扩展 candidate_analysis_history 表...');
    console.log('');
    
    // 读取SQL脚本
    const sqlFile = path.join(__dirname, 'database', 'expand_analysis_history_table.sql');
    if (!fs.existsSync(sqlFile)) {
      throw new Error(`SQL文件不存在: ${sqlFile}`);
    }
    
    const sqlScript = fs.readFileSync(sqlFile, 'utf8');
    
    // 连接数据库
    const dbConfig = {
      server: process.env.DB_HOST || process.env.CARGO_DB_HOST,
      port: parseInt(process.env.DB_PORT || '1433'),
      database: 'hotdog2030',
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };
    
    console.log('🔌 正在连接数据库...');
    console.log(`   服务器: ${dbConfig.server}`);
    console.log(`   数据库: ${dbConfig.database}`);
    console.log(`   用户名: ${dbConfig.user}`);
    console.log('');
    
    pool = await sql.connect(dbConfig);
    console.log('✅ 数据库连接成功');
    console.log('');
    
    // 执行SQL脚本
    console.log('🔨 正在执行SQL脚本...');
    console.log('');
    
    // 将SQL脚本按GO语句分割
    const batches = sqlScript.split(/\bGO\b/i).filter(batch => batch.trim().length > 0);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch.length === 0) continue;
      
      try {
        const result = await pool.request().query(batch);
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
          console.log(`✅ 批次 ${i + 1} 执行成功，影响 ${result.rowsAffected[0]} 行`);
        }
      } catch (err) {
        // 检查是否是预期错误（如字段已存在）
        if (err.message && err.message.includes('已存在')) {
          // 这些错误可以忽略
        } else {
          throw err;
        }
      }
    }
    
    console.log('');
    console.log('🎉 candidate_analysis_history 表扩展完成！');
    console.log('');
    console.log('📊 新增字段说明：');
    console.log('  - raw_ai_response: 原始AI响应文本');
    console.log('  - prompt: 使用的提示词');
    console.log('  - parsed_data: 解析后的结构化数据（JSON格式）');
    console.log('  - grade: 评分等级');
    console.log('  - strengths: 优势分析');
    console.log('  - weaknesses: 劣势分析');
    console.log('  - opportunities: 机会分析');
    console.log('  - threats: 威胁分析');
    console.log('  - conclusion: 结论');
    console.log('  - suggestions: 运营建议');
    console.log('  - ai_model_version: AI模型版本');
    console.log('  - api_metadata: API调用元数据');
    console.log('');
    
  } catch (error) {
    console.error('❌ 扩展失败:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 执行
expandAnalysisHistoryTable().then(() => {
  console.log('✅ 脚本执行完成');
  process.exit(0);
}).catch((error) => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

