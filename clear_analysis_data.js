#!/usr/bin/env node

// 确保从 backend 目录加载依赖
const path = require('path');
const Module = require('module');

const backendPath = path.join(__dirname, 'backend');
const backendNodeModules = path.join(backendPath, 'node_modules');

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

async function clearAnalysisData() {
    let conn;
    
    try {
        console.log('🔗 连接数据库...');
        conn = await sql.connect(config);
        console.log('✅ hotdog2030数据库连接成功\n');

        // 清空所有分析相关字段
        console.log('🧹 开始清空所有分析数据和评分...');
        
        const result = await conn.request().query(`
            UPDATE hotdog2030.dbo.candidate_locations
            SET 
                -- 分析结果字段
                analysis_score = NULL,
                poi_density_score = NULL,
                traffic_score = NULL,
                population_score = NULL,
                competition_score = NULL,
                rental_cost_score = NULL,
                
                -- 预测结果字段
                predicted_revenue = NULL,
                predicted_orders = NULL,
                predicted_customers = NULL,
                confidence_score = NULL,
                success_probability = NULL,
                risk_level = NULL,
                
                -- 状态重置为 pending
                status = 'pending',
                
                updated_at = GETDATE()
            WHERE ISNULL(delflag, 0) = 0
        `);

        console.log(`✅ 已清空 ${result.rowsAffected[0]} 条记录的分析数据\n`);

        // 验证清理结果
        const checkResult = await conn.request().query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN analysis_score IS NOT NULL THEN 1 ELSE 0 END) as with_analysis_score,
                SUM(CASE WHEN predicted_revenue IS NOT NULL THEN 1 ELSE 0 END) as with_predicted_revenue,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
            FROM hotdog2030.dbo.candidate_locations
            WHERE ISNULL(delflag, 0) = 0
        `);

        const stats = checkResult.recordset[0];
        console.log('📊 清理后数据统计:');
        console.log(`   总记录数: ${stats.total}`);
        console.log(`   有分析评分的记录: ${stats.with_analysis_score}`);
        console.log(`   有预测收入的记录: ${stats.with_predicted_revenue}`);
        console.log(`   待分析状态的记录: ${stats.pending_count}`);
        
    } catch (error) {
        console.error('❌ 清理失败:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
    } finally {
        if (conn) await conn.close();
        console.log('\n🔌 数据库连接已关闭');
    }
}

clearAnalysisData();

