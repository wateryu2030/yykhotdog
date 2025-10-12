const sql = require('mssql');

const config = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.DB_PORT) || 1433,
  user: process.env.DB_USER || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  database: 'master', // 连接到master数据库以便管理所有库
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const KEEP_DATABASES = ['hotdog2030', 'cyrg2025'];

async function cleanupDatabases() {
  try {
    console.log('=== 连接SQL Server... ===');
    const pool = await sql.connect(config);
    console.log('✅ 连接成功');

    // 查询所有数据库
    const result = await pool.request().query(`
      SELECT name FROM sys.databases
      WHERE name LIKE 'hotdog%' OR name LIKE 'zhhotdog%'
    `);
    const allDbs = result.recordset.map(r => r.name);
    console.log('所有相关数据库:', allDbs);

    // 需要删除的数据库
    const toDelete = allDbs.filter(name => !KEEP_DATABASES.includes(name));
    if (toDelete.length === 0) {
      console.log('无需删除，只有保留库。');
    } else {
      for (const dbName of toDelete) {
        try {
          console.log(`正在删除数据库: ${dbName} ...`);
          // 终止所有连接
          await pool.request().query(`ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE`);
          await pool.request().query(`DROP DATABASE [${dbName}]`);
          console.log(`✅ 已删除: ${dbName}`);
        } catch (err) {
          console.error(`❌ 删除${dbName}失败:`, err.message);
        }
      }
    }

    // 再次查询剩余数据库
    const leftResult = await pool.request().query(`
      SELECT name FROM sys.databases
      WHERE name LIKE 'hotdog%' OR name LIKE 'zhhotdog%' OR name = 'cyrg2025'
    `);
    const leftDbs = leftResult.recordset.map(r => r.name);
    console.log('剩余数据库:', leftDbs);

    await pool.close();
    console.log('=== 清理完成 ===');
  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
  }
}

cleanupDatabases(); 