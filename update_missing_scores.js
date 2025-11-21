#!/usr/bin/env node

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

function parseScore(description) {
    if (!description) return null;
    
    // 方式1: "**最终得分：** XX / 100" (Markdown格式)
    let match = description.match(/\*\*最终得分[：:]\*\*\s*(\d+(?:\.\d+)?)\s*\/\s*100/);
    if (match) {
        return parseFloat(match[1]);
    }
    
    // 方式2: "最终得分：XX / 100" (普通格式)
    match = description.match(/最终得分[：:]\s*(\d+(?:\.\d+)?)\s*\/\s*100/);
    if (match) {
        return parseFloat(match[1]);
    }
    
    // 方式3: "**最终得分：** XX" (Markdown格式)
    match = description.match(/\*\*最终得分[：:]\*\*\s*(\d+(?:\.\d+)?)/);
    if (match) {
        const score = parseFloat(match[1]);
        if (score >= 0 && score <= 100) {
            return score;
        }
    }
    
    // 方式4: "最终得分：XX" (普通格式)
    match = description.match(/最终得分[：:]\s*(\d+(?:\.\d+)?)/);
    if (match) {
        const score = parseFloat(match[1]);
        if (score >= 0 && score <= 100) {
            return score;
        }
    }
    
    return null;
}

async function updateMissingScores() {
    let conn;
    
    try {
        console.log('🔗 连接数据库...');
        conn = await sql.connect(config);
        console.log('✅ hotdog2030数据库连接成功\n');

        // 查找有描述但评分为0或NULL的记录
        const result = await conn.request().query(`
            SELECT 
                id,
                shop_name,
                description,
                analysis_score
            FROM hotdog2030.dbo.candidate_locations
            WHERE description IS NOT NULL
              AND LTRIM(RTRIM(description)) <> ''
              AND LEN(description) > 100
              AND (analysis_score IS NULL OR analysis_score = 0)
              AND ISNULL(delflag, 0) = 0
        `);

        console.log(`📊 找到 ${result.recordset.length} 条需要更新评分的记录\n`);

        let updated = 0;
        for (const row of result.recordset) {
            const score = parseScore(row.description);
            if (score !== null && score > 0) {
                await conn.request()
                    .input('id', sql.BigInt, row.id)
                    .input('score', sql.Decimal(5, 2), score)
                    .query(`
                        UPDATE hotdog2030.dbo.candidate_locations
                        SET analysis_score = @score,
                            updated_at = GETDATE()
                        WHERE id = @id
                    `);
                console.log(`✅ ID ${row.id} (${row.shop_name}): 更新评分为 ${score}`);
                updated++;
            } else {
                console.log(`⚠️ ID ${row.id} (${row.shop_name}): 未能提取评分`);
            }
        }

        console.log(`\n📊 更新完成: 成功更新 ${updated} 条记录的评分`);
        
    } catch (error) {
        console.error('❌ 更新失败:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
    } finally {
        if (conn) await conn.close();
        console.log('\n🔌 数据库连接已关闭');
    }
}

updateMissingScores();

