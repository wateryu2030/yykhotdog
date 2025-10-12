const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// 测试健康检查
async function testHealth() {
  try {
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    console.log('✅ 健康检查通过:', response.data);
    return true;
  } catch (error) {
    console.log('❌ 健康检查失败:', error.message);
    return false;
  }
}

// 测试选店模块API
async function testSiteSelection() {
  try {
    // 测试获取选址列表
    const response = await axios.get(`${BASE_URL}/site-selection/locations`);
    console.log('✅ 选店模块API测试通过:', response.data.success);
    return true;
  } catch (error) {
    console.log('❌ 选店模块API测试失败:', error.message);
    return false;
  }
}

// 测试认证API
async function testAuth() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'password'
    });
    console.log('✅ 认证API测试通过:', response.data.success);
    return true;
  } catch (error) {
    console.log('❌ 认证API测试失败:', error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始API测试...\n');
  
  const tests = [
    { name: '健康检查', fn: testHealth },
    { name: '选店模块', fn: testSiteSelection },
    { name: '认证模块', fn: testAuth }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    console.log(`📋 测试: ${test.name}`);
    const result = await test.fn();
    if (result) passed++;
    console.log('');
  }
  
  console.log(`📊 测试结果: ${passed}/${total} 通过`);
  
  if (passed === total) {
    console.log('🎉 所有测试通过！系统运行正常。');
  } else {
    console.log('⚠️  部分测试失败，请检查系统配置。');
  }
}

// 运行测试
runTests().catch(console.error); 