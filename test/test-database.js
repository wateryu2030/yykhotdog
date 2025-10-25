const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../backend/env.example' });

async function testRDSConnection() {
  console.log('🔍 测试RDS数据库连接...');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'zhotdog',
    connectTimeout: 10000,
    acquireTimeout: 10000,
    timeout: 10000,
    reconnect: true
  };

  console.log('📋 连接配置:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  User: ${config.user}`);
  console.log(`  Database: ${config.database}`);
  console.log(`  Password: ${config.password ? '***已设置***' : '未设置'}`);

  try {
    console.log('\n🔄 尝试连接数据库...');
    const connection = await mysql.createConnection(config);
    
    console.log('✅ RDS连接成功！');
    
    // 测试查询
    console.log('\n📊 测试数据库查询...');
    const [rows] = await connection.execute('SELECT VERSION() as version');
    console.log('✅ 数据库版本:', rows[0].version);
    
    // 测试创建表
    console.log('\n🏗️  测试创建测试表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS test_connection (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ 测试表创建成功');
    
    // 测试插入数据
    console.log('\n📝 测试插入数据...');
    await connection.execute(
      'INSERT INTO test_connection (test_name) VALUES (?)',
      ['RDS连接测试']
    );
    console.log('✅ 数据插入成功');
    
    // 测试查询数据
    console.log('\n🔍 测试查询数据...');
    const [testRows] = await connection.execute('SELECT * FROM test_connection ORDER BY id DESC LIMIT 1');
    console.log('✅ 查询结果:', testRows[0]);
    
    // 清理测试数据
    await connection.execute('DELETE FROM test_connection WHERE test_name = ?', ['RDS连接测试']);
    await connection.execute('DROP TABLE test_connection');
    console.log('✅ 测试数据清理完成');
    
    await connection.end();
    console.log('\n🎉 RDS数据库测试完成！');
    return true;
    
  } catch (error) {
    console.error('❌ RDS连接失败:', error.message);
    console.error('错误详情:', error);
    return false;
  }
}

async function testMaxComputeConnection() {
  console.log('\n🔍 测试MaxCompute连接...');
  
  const config = {
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    project: process.env.MAXCOMPUTE_PROJECT || 'zhhotdog_project',
    endpoint: process.env.MAXCOMPUTE_ENDPOINT || 'https://service.cn.maxcompute.aliyun.com/api'
  };

  console.log('📋 MaxCompute配置:');
  console.log(`  AccessKey ID: ${config.accessKeyId ? '***已设置***' : '未设置'}`);
  console.log(`  AccessKey Secret: ${config.accessKeySecret ? '***已设置***' : '未设置'}`);
  console.log(`  Project: ${config.project}`);
  console.log(`  Endpoint: ${config.endpoint}`);

  if (!config.accessKeyId || !config.accessKeySecret) {
    console.log('❌ MaxCompute配置不完整，跳过测试');
    return false;
  }

  try {
    // 这里需要安装MaxCompute SDK
    console.log('⚠️  MaxCompute SDK需要单独安装，请运行:');
    console.log('   npm install @alicloud/maxcompute');
    console.log('   或使用阿里云CLI工具测试');
    
    return false;
  } catch (error) {
    console.error('❌ MaxCompute连接失败:', error.message);
    return false;
  }
}

async function testDataWorksConnection() {
  console.log('\n🔍 测试DataWorks连接...');
  
  const config = {
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    region: process.env.ALIYUN_REGION || 'cn-hangzhou'
  };

  console.log('📋 DataWorks配置:');
  console.log(`  AccessKey ID: ${config.accessKeyId ? '***已设置***' : '未设置'}`);
  console.log(`  AccessKey Secret: ${config.accessKeySecret ? '***已设置***' : '未设置'}`);
  console.log(`  Region: ${config.region}`);

  if (!config.accessKeyId || !config.accessKeySecret) {
    console.log('❌ DataWorks配置不完整，跳过测试');
    return false;
  }

  try {
    console.log('⚠️  DataWorks API测试需要安装SDK，请运行:');
    console.log('   npm install @alicloud/dataworks-public');
    console.log('   或通过阿里云控制台验证权限');
    
    return false;
  } catch (error) {
    console.error('❌ DataWorks连接失败:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 开始连接测试...\n');
  
  const tests = [
    { name: 'RDS数据库', fn: testRDSConnection },
    { name: 'MaxCompute', fn: testMaxComputeConnection },
    { name: 'DataWorks', fn: testDataWorksConnection }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`测试: ${test.name}`);
    console.log(`${'='.repeat(50)}`);
    
    const result = await test.fn();
    if (result) passed++;
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 测试总结: ${passed}/${total} 通过`);
  console.log(`${'='.repeat(50)}`);
  
  if (passed === total) {
    console.log('🎉 所有连接测试通过！');
  } else if (passed > 0) {
    console.log('⚠️  部分连接测试通过，请检查失败的连接');
  } else {
    console.log('❌ 所有连接测试失败，请检查配置');
  }
  
  console.log('\n💡 建议:');
  console.log('1. 检查.env文件中的配置信息');
  console.log('2. 确认阿里云服务已开通');
  console.log('3. 验证AccessKey权限');
  console.log('4. 检查网络连接');
}

// 运行测试
runAllTests().catch(console.error); 