const sql = require('mssql');

async function testLocalDatabaseConnection() {
  console.log('🔍 测试本地SQL Server连接...');
  
  const config = {
    server: 'localhost',
    port: 1433,
    user: 'sa',
    password: 'YourStrong@Passw0rd', // 请根据您的实际密码修改
    database: 'master', // 先连接到master数据库
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: 10000,
      requestTimeout: 10000
    }
  };

  try {
    console.log('📡 正在连接数据库...');
    const pool = await sql.connect(config);
    console.log('✅ 数据库连接成功！');
    
    // 测试查询
    const result = await pool.request().query('SELECT @@VERSION as version');
    console.log('📊 SQL Server版本:', result.recordset[0].version);
    
    // 检查数据库是否存在
    const dbCheck = await pool.request().query(`
      SELECT name FROM sys.databases 
      WHERE name IN ('hotdog2030', 'cyrg2025')
    `);
    
    console.log('📋 现有数据库:');
    if (dbCheck.recordset.length > 0) {
      dbCheck.recordset.forEach(db => {
        console.log(`  - ${db.name}`);
      });
    } else {
      console.log('  - 未找到目标数据库，需要创建');
    }
    
    await pool.close();
    console.log('✅ 测试完成，连接已关闭');
    
  } catch (error) {
    console.error('❌ 数据库连接失败:');
    console.error('错误信息:', error.message);
    console.error('错误代码:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 可能的解决方案:');
      console.log('1. 确保SQL Server服务正在运行');
      console.log('2. 检查端口1433是否被占用');
      console.log('3. 如果使用Docker，确保容器正在运行');
    } else if (error.code === 'ELOGIN') {
      console.log('\n💡 可能的解决方案:');
      console.log('1. 检查用户名和密码是否正确');
      console.log('2. 确保SQL Server允许SQL Server身份验证');
    }
  }
}

// 运行测试
testLocalDatabaseConnection();
