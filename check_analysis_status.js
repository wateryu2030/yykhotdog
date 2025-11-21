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

async function checkAnalysisStatus() {
    let conn;
    
    try {
        console.log('🔗 连接数据库...');
        conn = await sql.connect(config);
        console.log('✅ hotdog2030数据库连接成功\n');

        // 统计分析数据
        const statsResult = await conn.request().query(`
            SELECT 
                COUNT(*) as total_count,
                COUNT(CASE WHEN analysis_score IS NOT NULL THEN 1 END) as analyzed_count,
                COUNT(CASE WHEN analysis_score IS NULL THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'analyzed' THEN 1 END) as analyzed_status_count,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_status_count,
                AVG(CASE WHEN analysis_score IS NOT NULL THEN analysis_score END) as avg_score,
                MIN(CASE WHEN analysis_score IS NOT NULL THEN analysis_score END) as min_score,
                MAX(CASE WHEN analysis_score IS NOT NULL THEN analysis_score END) as max_score,
                COUNT(CASE WHEN analysis_score >= 80 THEN 1 END) as excellent_count,
                COUNT(CASE WHEN analysis_score >= 60 AND analysis_score < 80 THEN 1 END) as good_count,
                COUNT(CASE WHEN analysis_score < 60 AND analysis_score IS NOT NULL THEN 1 END) as poor_count,
                COUNT(CASE WHEN description IS NOT NULL AND LTRIM(RTRIM(description)) <> '' THEN 1 END) as with_description_count
            FROM hotdog2030.dbo.candidate_locations
            WHERE ISNULL(delflag, 0) = 0
        `);

        const stats = statsResult.recordset[0];
        console.log('📊 分析数据统计:');
        console.log(`   总记录数: ${stats.total_count}`);
        console.log(`   已分析记录数: ${stats.analyzed_count} (${((stats.analyzed_count / stats.total_count) * 100).toFixed(1)}%)`);
        console.log(`   待分析记录数: ${stats.pending_count} (${((stats.pending_count / stats.total_count) * 100).toFixed(1)}%)`);
        console.log(`   状态为"已分析"的记录: ${stats.analyzed_status_count}`);
        console.log(`   状态为"待分析"的记录: ${stats.pending_status_count}`);
        console.log(`   平均评分: ${stats.avg_score ? parseFloat(stats.avg_score).toFixed(2) : 'N/A'}`);
        console.log(`   最低评分: ${stats.min_score || 'N/A'}`);
        console.log(`   最高评分: ${stats.max_score || 'N/A'}`);
        console.log(`   优秀评分(≥80): ${stats.excellent_count}`);
        console.log(`   良好评分(60-79): ${stats.good_count}`);
        console.log(`   一般评分(<60): ${stats.poor_count}`);
        console.log(`   有详细描述的报告: ${stats.with_description_count}`);
        console.log('');

        // 显示前10条已分析的记录
        const analyzedResult = await conn.request().query(`
            SELECT TOP 10
                id,
                shop_name,
                shop_address,
                analysis_score,
                status,
                LEN(description) as description_length,
                updated_at
            FROM hotdog2030.dbo.candidate_locations
            WHERE analysis_score IS NOT NULL
              AND ISNULL(delflag, 0) = 0
            ORDER BY updated_at DESC
        `);

        if (analyzedResult.recordset.length > 0) {
            console.log('✅ 最近分析的10条记录:');
            analyzedResult.recordset.forEach((row, index) => {
                console.log(`\n${index + 1}. ID: ${row.id}`);
                console.log(`   店铺名: ${row.shop_name || '(空)'}`);
                console.log(`   地址: ${row.shop_address || '(空)'}`);
                console.log(`   评分: ${row.analysis_score}`);
                console.log(`   状态: ${row.status}`);
                console.log(`   描述长度: ${row.description_length} 字符`);
                console.log(`   更新时间: ${row.updated_at || '(空)'}`);
            });
        } else {
            console.log('⚠️ 没有找到已分析的记录');
        }

        console.log('');

        // 显示前10条待分析的记录
        const pendingResult = await conn.request().query(`
            SELECT TOP 10
                id,
                shop_name,
                shop_address,
                status,
                updated_at
            FROM hotdog2030.dbo.candidate_locations
            WHERE analysis_score IS NULL
              AND ISNULL(delflag, 0) = 0
            ORDER BY id
        `);

        if (pendingResult.recordset.length > 0) {
            console.log('⚠️ 前10条待分析的记录:');
            pendingResult.recordset.forEach((row, index) => {
                console.log(`\n${index + 1}. ID: ${row.id}`);
                console.log(`   店铺名: ${row.shop_name || '(空)'}`);
                console.log(`   地址: ${row.shop_address || '(空)'}`);
                console.log(`   状态: ${row.status}`);
            });
        } else {
            console.log('✅ 所有记录都已分析');
        }

        // 检查描述内容示例（查看是否有综合分析报告）
        const descriptionSampleResult = await conn.request().query(`
            SELECT TOP 3
                id,
                shop_name,
                LEFT(description, 200) as description_sample
            FROM hotdog2030.dbo.candidate_locations
            WHERE description IS NOT NULL
              AND LTRIM(RTRIM(description)) <> ''
              AND LEN(description) > 100
            ORDER BY updated_at DESC
        `);

        if (descriptionSampleResult.recordset.length > 0) {
            console.log('\n📋 综合分析报告示例（前3条）:');
            descriptionSampleResult.recordset.forEach((row, index) => {
                console.log(`\n${index + 1}. ID: ${row.id} - ${row.shop_name}`);
                console.log(`   报告内容预览: ${row.description_sample}...`);
            });
        }
        
    } catch (error) {
        console.error('❌ 检查失败:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
    } finally {
        if (conn) await conn.close();
        console.log('\n🔌 数据库连接已关闭');
    }
}

checkAnalysisStatus();

