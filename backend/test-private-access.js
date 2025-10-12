const CustomerProfileService = require('./src/services/CustomerProfileService.ts').default;

async function testPrivateAccess() {
  try {
    console.log('🔍 测试私有属性访问...');
    
    const service = new CustomerProfileService();
    console.log('✅ CustomerProfileService实例化成功');
    
    // 尝试访问私有属性
    console.log('🔍 尝试访问hotdogConfig...');
    console.log('hotdogConfig:', service.hotdogConfig);
    
    // 尝试访问cyrg2025Config
    console.log('🔍 尝试访问cyrg2025Config...');
    console.log('cyrg2025Config:', service.cyrg2025Config);
    
    console.log('✅ 测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testPrivateAccess(); 