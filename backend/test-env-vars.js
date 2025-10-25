require('dotenv').config({ path: '../.env' });

console.log('🔍 检查AI API密钥配置...');
console.log('');

console.log('通义千问API密钥:');
console.log('- QWEN_API_KEY:', process.env.QWEN_API_KEY ? '已配置' : '未配置');
if (process.env.QWEN_API_KEY) {
  console.log('- 密钥长度:', process.env.QWEN_API_KEY.length);
  console.log('- 密钥前缀:', process.env.QWEN_API_KEY.substring(0, 10) + '...');
}

console.log('');

console.log('腾讯混元API密钥:');
console.log('- HUNYUAN_API_KEY:', process.env.HUNYUAN_API_KEY ? '已配置' : '未配置');
if (process.env.HUNYUAN_API_KEY) {
  console.log('- 密钥长度:', process.env.HUNYUAN_API_KEY.length);
  console.log('- 密钥前缀:', process.env.HUNYUAN_API_KEY.substring(0, 10) + '...');
}

console.log('');

console.log('豆包API密钥:');
console.log('- DOUBAO_API_KEY:', process.env.DOUBAO_API_KEY ? '已配置' : '未配置');
if (process.env.DOUBAO_API_KEY) {
  console.log('- 密钥长度:', process.env.DOUBAO_API_KEY.length);
  console.log('- 密钥前缀:', process.env.DOUBAO_API_KEY.substring(0, 10) + '...');
}

console.log('');

// 检查密钥是否有效（不是默认值）
const validKeys = [];
if (process.env.QWEN_API_KEY && process.env.QWEN_API_KEY !== 'your_qwen_api_key') {
  validKeys.push('通义千问');
}
if (process.env.HUNYUAN_API_KEY && process.env.HUNYUAN_API_KEY !== 'your_hunyuan_api_key') {
  validKeys.push('腾讯混元');
}
if (process.env.DOUBAO_API_KEY && process.env.DOUBAO_API_KEY !== 'your_doubao_api_key') {
  validKeys.push('豆包');
}

console.log('✅ 有效的AI API密钥:');
if (validKeys.length > 0) {
  validKeys.forEach(key => console.log('- ' + key));
} else {
  console.log('- 无有效密钥，将使用模拟数据');
} 