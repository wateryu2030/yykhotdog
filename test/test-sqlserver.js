const { Connection, Request } = require('tedious');
require('dotenv').config({ path: '../.env' });

async function testSQLServerConnection() {
  console.log('🔍 测试SQL Server RDS连接...');
  
  const config = {
    server: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    userName: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'your_local_password_here',
    database: process.env.DB_NAME || 'cyrg2025',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: 30000,
      requestTimeout: 30000
    }
  };

  console.log('📋 连接配置:');
  console.log(`  Server: ${config.server}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  User: ${config.userName}`);
  console.log(`  Database: ${config.database}`);
  console.log(`  Password: ${config.password ? '***已设置***' : '未设置'}`);

  return new Promise((resolve, reject) => {
    const connection = new Connection(config);
    
    connection.on('connect', (err) => {
      if (err) {
        console.error('❌ 连接失败:', err.message);
        reject(err);
        return;
      }
      
      console.log('✅ SQL Server连接成功！');
      
      // 测试查询
      console.log('\n📊 测试数据库查询...');
      const request = new Request('SELECT @@VERSION as version', (err, rowCount, rows) => {
        if (err) {
          console.error('❌ 查询失败:', err.message);
          reject(err);
          return;
        }
        
        console.log('✅ 查询成功');
        if (rows && rows.length > 0) {
          console.log('📋 SQL Server版本:', rows[0].version.value);
        }
        
        // 测试创建表
        console.log('\n🏗️  测试创建测试表...');
        const createTableRequest = new Request(`
          IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='test_connection' AND xtype='U')
          CREATE TABLE test_connection (
            id INT IDENTITY(1,1) PRIMARY KEY,
            test_name NVARCHAR(100),
            created_at DATETIME DEFAULT GETDATE()
          )
        `, (err, rowCount) => {
          if (err) {
            console.error('❌ 创建表失败:', err.message);
            reject(err);
            return;
          }
          
          console.log('✅ 测试表创建成功');
          
          // 测试插入数据
          console.log('\n📝 测试插入数据...');
          const insertRequest = new Request(
            'INSERT INTO test_connection (test_name) VALUES (@testName)',
            (err, rowCount) => {
              if (err) {
                console.error('❌ 插入数据失败:', err.message);
                reject(err);
                return;
              }
              
              console.log('✅ 数据插入成功');
              
              // 测试查询数据
              console.log('\n🔍 测试查询数据...');
              const selectRequest = new Request(
                'SELECT TOP 1 * FROM test_connection ORDER BY id DESC',
                (err, rowCount, rows) => {
                  if (err) {
                    console.error('❌ 查询数据失败:', err.message);
                    reject(err);
                    return;
                  }
                  
                  console.log('✅ 查询结果:', rows[0]);
                  
                  // 清理测试数据
                  console.log('\n🧹 清理测试数据...');
                  const cleanupRequest = new Request(
                    'DELETE FROM test_connection WHERE test_name = @testName; DROP TABLE test_connection',
                    (err, rowCount) => {
                      if (err) {
                        console.error('⚠️  清理数据失败:', err.message);
                      } else {
                        console.log('✅ 测试数据清理完成');
                      }
                      
                      connection.close();
                      console.log('\n🎉 SQL Server数据库测试完成！');
                      resolve(true);
                    }
                  );
                  
                  cleanupRequest.addParameter('testName', require('tedious').TYPES.NVarChar, 'SQL Server连接测试');
                  connection.execSql(cleanupRequest);
                }
              );
              
              connection.execSql(selectRequest);
            }
          );
          
          insertRequest.addParameter('testName', require('tedious').TYPES.NVarChar, 'SQL Server连接测试');
          connection.execSql(insertRequest);
        });
        
        connection.execSql(createTableRequest);
      });
      
      connection.execSql(request);
    });
    
    connection.connect();
  });
}

async function testSequelizeConnection() {
  console.log('\n🔍 测试Sequelize连接...');
  
  try {
    const { Sequelize } = require('sequelize');
    
    const sequelize = new Sequelize({
      database: process.env.DB_NAME || 'cyrg2025',
      username: process.env.DB_USERNAME || 'hotdog',
      password: process.env.DB_PASSWORD || 'Zhkj@62102218',
      host: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
      port: parseInt(process.env.DB_PORT || '1433'),
      dialect: 'mssql',
      dialectOptions: {
        options: {
          encrypt: false,
          trustServerCertificate: true
        }
      },
      logging: false
    });
    
    await sequelize.authenticate();
    console.log('✅ Sequelize连接成功！');
    
    await sequelize.close();
    return true;
  } catch (error) {
    console.error('❌ Sequelize连接失败:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 开始SQL Server数据库连接测试...\n');
  
  try {
    // 测试原生连接
    await testSQLServerConnection();
    
    // 测试Sequelize连接
    await testSequelizeConnection();
    
    console.log('\n🎉 所有数据库连接测试通过！');
  } catch (error) {
    console.error('\n❌ 数据库连接测试失败:', error.message);
    console.log('\n💡 故障排除建议:');
    console.log('1. 检查网络连接');
    console.log('2. 验证数据库凭据');
    console.log('3. 确认防火墙设置');
    console.log('4. 检查RDS实例状态');
  }
}

main(); 