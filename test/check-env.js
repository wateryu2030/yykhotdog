const fs = require('fs');
const path = require('path');

console.log('🔍 检查环境变量配置...\n');

// 检查.env文件是否存在
const envPath = path.join(__dirname, '../backend/env.example');
if (fs.existsSync(envPath)) {
    console.log('✅ 找到环境变量文件:', envPath);
    
    // 读取并解析环境变量
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#][^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            envVars[key] = value;
        }
    });
    
    console.log('\n📋 环境变量配置:');
    console.log('='.repeat(50));
    
    // 检查关键配置
    const keyConfigs = [
        { key: 'DB_HOST', name: '数据库主机', required: true },
        { key: 'DB_PORT', name: '数据库端口', required: true },
        { key: 'DB_USERNAME', name: '数据库用户名', required: true },
        { key: 'DB_PASSWORD', name: '数据库密码', required: true },
        { key: 'DB_NAME', name: '数据库名称', required: true },
        { key: 'ALIYUN_ACCESS_KEY_ID', name: '阿里云AccessKey ID', required: true },
        { key: 'ALIYUN_ACCESS_KEY_SECRET', name: '阿里云AccessKey Secret', required: true },
        { key: 'ALIYUN_REGION', name: '阿里云区域', required: true },
        { key: 'MAXCOMPUTE_PROJECT', name: 'MaxCompute项目', required: false },
        { key: 'MAXCOMPUTE_ENDPOINT', name: 'MaxCompute端点', required: false },
        { key: 'JWT_SECRET', name: 'JWT密钥', required: true },
        { key: 'NODE_ENV', name: 'Node环境', required: false },
        { key: 'PORT', name: '服务端口', required: false }
    ];
    
    let missingRequired = 0;
    let missingOptional = 0;
    
    keyConfigs.forEach(config => {
        const value = envVars[config.key];
        const status = value ? '✅' : (config.required ? '❌' : '⚠️');
        const displayValue = value ? 
            (config.key.includes('PASSWORD') || config.key.includes('SECRET') ? '***已设置***' : value) : 
            '未设置';
        
        console.log(`${status} ${config.name}: ${displayValue}`);
        
        if (!value) {
            if (config.required) {
                missingRequired++;
            } else {
                missingOptional++;
            }
        }
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 配置状态:');
    
    if (missingRequired === 0) {
        console.log('✅ 所有必需配置已设置');
    } else {
        console.log(`❌ 缺少 ${missingRequired} 个必需配置`);
    }
    
    if (missingOptional > 0) {
        console.log(`⚠️  缺少 ${missingOptional} 个可选配置`);
    }
    
    // 验证配置值
    console.log('\n🔍 配置验证:');
    
    // 验证数据库配置
    if (envVars.DB_HOST && envVars.DB_HOST.includes('localhost')) {
        console.log('⚠️  数据库主机设置为localhost，生产环境应使用RDS地址');
    }
    
    if (envVars.DB_PASSWORD === 'your_password_here') {
        console.log('❌ 数据库密码未修改，请设置实际密码');
    }
    
    if (envVars.JWT_SECRET === 'your_jwt_secret_key_here') {
        console.log('❌ JWT密钥未修改，请设置安全的密钥');
    }
    
    // 验证阿里云配置
    if (envVars.ALIYUN_ACCESS_KEY_ID && envVars.ALIYUN_ACCESS_KEY_ID.length > 0) {
        console.log('✅ 阿里云AccessKey ID已设置');
    }
    
    if (envVars.ALIYUN_ACCESS_KEY_SECRET && envVars.ALIYUN_ACCESS_KEY_SECRET.length > 0) {
        console.log('✅ 阿里云AccessKey Secret已设置');
    }
    
    // 检查MaxCompute配置
    if (envVars.MAXCOMPUTE_PROJECT) {
        console.log(`✅ MaxCompute项目: ${envVars.MAXCOMPUTE_PROJECT}`);
    } else {
        console.log('⚠️  MaxCompute项目未设置，将使用默认值');
    }
    
    console.log('\n💡 建议:');
    console.log('1. 复制 env.example 为 .env 文件');
    console.log('2. 修改 .env 文件中的配置值');
    console.log('3. 确保数据库密码和JWT密钥已设置');
    console.log('4. 验证阿里云AccessKey权限');
    
} else {
    console.log('❌ 未找到环境变量文件');
    console.log('请确保 backend/env.example 文件存在');
} 