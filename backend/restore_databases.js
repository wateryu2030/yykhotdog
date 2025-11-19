#!/usr/bin/env node
/**
 * 使用Node.js恢复数据库脚本
 * 使用mssql包连接RDS并执行恢复操作
 */

const sql = require('mssql');
const path = require('path');
const fs = require('fs');

// RDS连接配置
const RDS_CONFIG = {
  server: 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: 1433,
  database: 'master', // 连接到master数据库进行恢复操作
  user: 'hotdog',
  password: 'Zhkj@62102218',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 120000, // 2分钟连接超时
    requestTimeout: 600000, // 10分钟请求超时，恢复可能需要较长时间
    enableArithAbort: true,
  },
  pool: {
    max: 1,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// 备份文件路径
const BACKUP_DIR = path.join(__dirname, '..', 'database');
const CYRG_BACKUP = path.join(BACKUP_DIR, 'cyrg20251117.bak');
const ZHKJ_BACKUP = path.join(BACKUP_DIR, 'zhkj20251117.bak');

async function checkBackupFileInfo(pool, backupFile) {
  try {
    console.log(`\n检查备份文件信息: ${backupFile}`);
    const result = await pool.request().query(`
      RESTORE FILELISTONLY FROM DISK = '${backupFile.replace(/'/g, "''")}'
    `);
    
    console.log('备份文件信息:');
    console.log('-'.repeat(50));
    const dataFile = result.recordset.find(r => r.Type === 'D');
    const logFile = result.recordset.find(r => r.Type === 'L');
    
    if (dataFile) {
      console.log(`数据文件逻辑名称: ${dataFile.LogicalName}`);
      console.log(`数据文件物理名称: ${dataFile.PhysicalName}`);
    }
    if (logFile) {
      console.log(`日志文件逻辑名称: ${logFile.LogicalName}`);
      console.log(`日志文件物理名称: ${logFile.PhysicalName}`);
    }
    console.log('-'.repeat(50));
    
    return {
      dataLogicalName: dataFile?.LogicalName,
      logLogicalName: logFile?.LogicalName,
    };
  } catch (error) {
    console.error(`检查备份文件信息失败: ${error.message}`);
    return null;
  }
}

async function restoreDatabase(pool, dbName, backupFile, logicalNames) {
  try {
    console.log(`\n开始恢复数据库: ${dbName}`);
    console.log(`备份文件: ${backupFile}`);
    
    // 删除现有数据库
    console.log('删除现有数据库...');
    const dropSql = `
      IF EXISTS (SELECT name FROM sys.databases WHERE name = '${dbName}')
      BEGIN
        ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
        DROP DATABASE [${dbName}];
      END
    `;
    
    await pool.request().query(dropSql);
    console.log('✅ 现有数据库已删除');
    
    // 构建恢复SQL
    let restoreSql = `
      RESTORE DATABASE [${dbName}] 
      FROM DISK = '${backupFile.replace(/'/g, "''")}'
      WITH REPLACE
    `;
    
    // 如果有逻辑名称，使用MOVE子句
    if (logicalNames && logicalNames.dataLogicalName) {
      restoreSql = `
        RESTORE DATABASE [${dbName}] 
        FROM DISK = '${backupFile.replace(/'/g, "''")}'
        WITH 
          MOVE '${logicalNames.dataLogicalName}' TO '/var/opt/mssql/data/${dbName}.mdf',
          MOVE '${logicalNames.logLogicalName || logicalNames.dataLogicalName + '_log'}' TO '/var/opt/mssql/data/${dbName}_log.ldf',
          REPLACE
      `;
    }
    
    console.log('执行数据库恢复（这可能需要几分钟）...');
    console.log('恢复SQL:', restoreSql.substring(0, 200) + '...');
    
    await pool.request().query(restoreSql);
    console.log(`✅ 数据库 ${dbName} 恢复成功！`);
    
    return true;
  } catch (error) {
    console.error(`❌ 恢复数据库 ${dbName} 失败: ${error.message}`);
    console.error('错误详情:', error);
    return false;
  }
}

async function verifyDatabases(pool) {
  try {
    console.log('\n验证数据库恢复结果...');
    const result = await pool.request().query(`
      SELECT 
        name as '数据库名称',
        database_id as '数据库ID',
        create_date as '创建日期'
      FROM sys.databases 
      WHERE name IN ('cyrg2025', 'cyrgweixin')
      ORDER BY name
    `);
    
    console.log('-'.repeat(50));
    result.recordset.forEach(row => {
      console.log(`数据库名称: ${row['数据库名称']}`);
      console.log(`数据库ID: ${row['数据库ID']}`);
      console.log(`创建日期: ${row['创建日期']}`);
      console.log('-'.repeat(50));
    });
    
    return result.recordset.length >= 2;
  } catch (error) {
    console.error(`验证数据库失败: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('开始数据库恢复操作到RDS...');
  console.log('='.repeat(60));
  
  // 检查备份文件
  if (!fs.existsSync(CYRG_BACKUP)) {
    console.error(`❌ cyrg备份文件不存在: ${CYRG_BACKUP}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(ZHKJ_BACKUP)) {
    console.error(`❌ zhkj备份文件不存在: ${ZHKJ_BACKUP}`);
    process.exit(1);
  }
  
  console.log(`\n备份文件:`);
  console.log(`  cyrg: ${CYRG_BACKUP}`);
  console.log(`  zhkj: ${ZHKJ_BACKUP}`);
  
  let pool;
  try {
    // 连接RDS数据库
    console.log('\n连接RDS数据库...');
    pool = await sql.connect(RDS_CONFIG);
    console.log('✅ RDS数据库连接成功');
    
    // 检查备份文件信息
    console.log('\n' + '='.repeat(60));
    console.log('1. 检查备份文件信息');
    console.log('='.repeat(60));
    
    const cyrgInfo = await checkBackupFileInfo(pool, CYRG_BACKUP);
    const zhkjInfo = await checkBackupFileInfo(pool, ZHKJ_BACKUP);
    
    // 恢复 cyrg2025 数据库
    console.log('\n' + '='.repeat(60));
    console.log('2. 恢复 cyrg2025 数据库');
    console.log('='.repeat(60));
    const success1 = await restoreDatabase(pool, 'cyrg2025', CYRG_BACKUP, cyrgInfo);
    
    // 恢复 cyrgweixin 数据库
    console.log('\n' + '='.repeat(60));
    console.log('3. 恢复 cyrgweixin 数据库');
    console.log('='.repeat(60));
    const success2 = await restoreDatabase(pool, 'cyrgweixin', ZHKJ_BACKUP, zhkjInfo);
    
    // 验证恢复结果
    console.log('\n' + '='.repeat(60));
    console.log('4. 验证数据库恢复结果');
    console.log('='.repeat(60));
    const verifySuccess = await verifyDatabases(pool);
    
    // 总结
    console.log('\n' + '='.repeat(60));
    console.log('恢复操作总结:');
    console.log('='.repeat(60));
    console.log(`cyrg2025 数据库恢复: ${success1 ? '✅ 成功' : '❌ 失败'}`);
    console.log(`cyrgweixin 数据库恢复: ${success2 ? '✅ 成功' : '❌ 失败'}`);
    console.log(`数据库验证: ${verifySuccess ? '✅ 成功' : '❌ 失败'}`);
    
    if (success1 && success2 && verifySuccess) {
      console.log('\n✅ 所有数据库恢复操作完成！');
      console.log('\n下一步: 需要将数据同步到hotdog2030数据库');
    } else {
      console.log('\n❌ 部分数据库恢复操作失败，请检查错误信息');
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`\n❌ 恢复过程中发生错误: ${error.message}`);
    console.error('错误详情:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\nRDS数据库连接已关闭');
    }
  }
}

// 执行主函数
main().catch(error => {
  console.error('未处理的错误:', error);
  process.exit(1);
});

