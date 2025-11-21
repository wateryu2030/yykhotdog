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

async function fixDescriptionField() {
    let conn;
    
    try {
        console.log('🔗 连接数据库...');
        conn = await sql.connect(config);
        console.log('✅ hotdog2030数据库连接成功\n');

        console.log('🔧 检查当前description字段类型...');
        const checkResult = await conn.request().query(`
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'candidate_locations'
              AND COLUMN_NAME = 'description';
        `);
        
        const currentField = checkResult.recordset[0];
        console.log(`当前字段类型: ${currentField.DATA_TYPE}(${currentField.CHARACTER_MAXIMUM_LENGTH})`);
        
        if (currentField.CHARACTER_MAXIMUM_LENGTH === 1000) {
            console.log('\n📝 开始修改description字段类型为NVARCHAR(MAX)...');
            
            const alterResult = await conn.request().query(`
                ALTER TABLE hotdog2030.dbo.candidate_locations
                ALTER COLUMN description NVARCHAR(MAX);
            `);
            
            console.log('✅ description字段已修改为NVARCHAR(MAX)');
            
            // 验证修改结果
            const verifyResult = await conn.request().query(`
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    CHARACTER_MAXIMUM_LENGTH,
                    IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'candidate_locations'
                  AND COLUMN_NAME = 'description';
            `);
            
            const updatedField = verifyResult.recordset[0];
            console.log(`修改后字段类型: ${updatedField.DATA_TYPE}(${updatedField.CHARACTER_MAXIMUM_LENGTH || 'MAX'})`);
            
        } else {
            console.log('✅ description字段已经是NVARCHAR(MAX)，无需修改');
        }
        
    } catch (error) {
        console.error('❌ 修改失败:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
    } finally {
        if (conn) await conn.close();
        console.log('\n🔌 数据库连接已关闭');
    }
}

fixDescriptionField();

