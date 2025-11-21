#!/usr/bin/env node

// 确保从 backend 目录加载依赖
const path = require('path');
const Module = require('module');

// 将 backend/node_modules 添加到模块搜索路径
const backendPath = path.join(__dirname, 'backend');
const backendNodeModules = path.join(backendPath, 'node_modules');

// 修改模块解析路径
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' && !request.startsWith('.') && !path.isAbsolute(request)) {
      try {
        const backendModulePath = path.join(backendNodeModules, request);
        return originalResolveFilename.call(this, backendModulePath, parent, isMain, options);
      } catch (e2) {
        throw e;
      }
    }
    throw e;
  }
};

const sql = require('mssql');
const fs = require('fs');

// 数据库配置
const config = {
    server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
    database: 'hotdog2030',
    user: process.env.DB_USERNAME || 'hotdog',
    password: process.env.DB_PASSWORD || 'your_password',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function createSiteSelectionTables() {
    try {
        console.log('🔗 连接数据库...');
        await sql.connect(config);
        console.log('✅ 数据库连接成功');

        // 读取SQL脚本
        const sqlScript = fs.readFileSync('database/create_site_selection_tables.sql', 'utf8');
        
        // 分割SQL语句（按GO分割）
        const statements = sqlScript.split('GO').filter(stmt => stmt.trim());
        
        console.log(`📋 准备执行 ${statements.length} 条SQL语句...`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement) {
                try {
                    console.log(`执行语句 ${i + 1}/${statements.length}...`);
                    await sql.query(statement);
                    console.log(`✅ 语句 ${i + 1} 执行成功`);
                } catch (error) {
                    console.log(`⚠️ 语句 ${i + 1} 执行失败: ${error.message}`);
                    // 继续执行其他语句
                }
            }
        }
        
        console.log('🎉 智能选址数据库表创建完成！');
        
        // 验证表是否创建成功
        console.log('\\n🔍 验证表创建结果...');
        const result = await sql.query(`
            SELECT 
                t.name as table_name,
                p.rows as row_count
            FROM sys.tables t
            LEFT JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0,1)
            WHERE t.name IN ('candidate_locations', 'site_selections', 'ml_features', 'site_analysis_history', 'data_sync_status')
            ORDER BY t.name
        `);
        
        console.log('📊 表创建结果:');
        result.recordset.forEach(row => {
            console.log(`   ${row.table_name}: ${row.row_count || 0} 行`);
        });
        
    } catch (error) {
        console.error('❌ 执行失败:', error.message);
    } finally {
        await sql.close();
        console.log('🔌 数据库连接已关闭');
    }
}

// 执行
createSiteSelectionTables();
