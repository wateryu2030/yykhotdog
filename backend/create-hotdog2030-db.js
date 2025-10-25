const sql = require('mssql');

const config = {
  user: 'hotdog',
  password: 'Zhkj@62102218',
  server: 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: 1433,
  database: 'master', // 连接到master数据库以便创建新库
  options: {
    encrypt: true, // 对于阿里云RDS SQL Server必须开启
    trustServerCertificate: true,
  },
};

async function createDatabase() {
  try {
    await sql.connect(config);
    const dbName = 'hotdog2030';
    // 判断数据库是否已存在
    const checkResult = await sql.query`SELECT name FROM sys.databases WHERE name = ${dbName}`;
    if (checkResult.recordset.length > 0) {
      console.log(`数据库 ${dbName} 已存在，无需创建。`);
    } else {
      await sql.query(`CREATE DATABASE [${dbName}]`);
      console.log(`数据库 ${dbName} 创建成功！`);
    }
    await sql.close();
  } catch (err) {
    console.error('创建数据库出错:', err);
    process.exit(1);
  }
}

createDatabase(); 