const fs = require('fs');
const path = require('path');

// 需要修复的文件类型
const FILE_EXTENSIONS = ['.js', '.ts'];
// 需要排除的目录
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage'];
// 需要排除的文件
const EXCLUDE_FILES = ['package-lock.json', 'yarn.lock', '*.min.js', 'check-environment-variables.js', 'fix-database-configs.js'];

// 修复规则
const FIX_RULES = [
  {
    // 修复 mssql 配置
    pattern: /const\s+config\s*=\s*{\s*server:\s*['"]rm-uf660d00xovkm30678o\.sqlserver\.rds\.aliyuncs\.com['"],\s*port:\s*1433,\s*user:\s*['"]hotdog['"],\s*password:\s*['"]Zhkj@62102218['"],\s*database:\s*['"]hotdog2030['"]/gs,
    replacement: `const config = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.DB_PORT) || 1433,
  user: process.env.DB_USER || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  database: process.env.DB_NAME || 'hotdog2030'`,
    description: '修复 mssql 配置为环境变量'
  },
  {
    // 修复 cyrg2025 数据库配置
    pattern: /const\s+config\s*=\s*{\s*server:\s*['"]rm-uf660d00xovkm30678o\.sqlserver\.rds\.aliyuncs\.com['"],\s*port:\s*1433,\s*user:\s*['"]hotdog['"],\s*password:\s*['"]Zhkj@62102218['"],\s*database:\s*['"]cyrg2025['"]/gs,
    replacement: `const config = {
  server: process.env.cyrg2025_DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.cyrg2025_DB_PORT) || 1433,
  user: process.env.cyrg2025_DB_USER || 'hotdog',
  password: process.env.cyrg2025_DB_PASSWORD || 'Zhkj@62102218',
  database: process.env.cyrg2025_DB_NAME || 'cyrg2025'`,
    description: '修复 cyrg2025 数据库配置为环境变量'
  },
  {
    // 修复 Sequelize 配置
    pattern: /host:\s*['"]rm-uf660d00xovkm30678o\.sqlserver\.rds\.aliyuncs\.com['"],\s*port:\s*1433,\s*username:\s*['"]hotdog['"],\s*password:\s*['"]Zhkj@62102218['"],\s*database:\s*['"]cyrg2025['"]/gs,
    replacement: `host: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
    port: parseInt(process.env.DB_PORT) || 1433,
    username: process.env.DB_USERNAME || 'hotdog',
    password: process.env.DB_PASSWORD || 'Zhkj@62102218',
    database: process.env.DB_NAME || 'cyrg2025'`,
    description: '修复 Sequelize 配置为环境变量'
  },
  {
    // 修复单独的硬编码值
    pattern: /server:\s*['"]rm-uf660d00xovkm30678o\.sqlserver\.rds\.aliyuncs\.com['"]/g,
    replacement: `server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com'`,
    description: '修复硬编码的服务器地址'
  },
  {
    pattern: /host:\s*['"]rm-uf660d00xovkm30678o\.sqlserver\.rds\.aliyuncs\.com['"]/g,
    replacement: `host: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com'`,
    description: '修复硬编码的主机地址'
  },
  {
    pattern: /port:\s*1433/g,
    replacement: `port: parseInt(process.env.DB_PORT) || 1433`,
    description: '修复硬编码的端口'
  },
  {
    pattern: /user:\s*['"]hotdog['"]/g,
    replacement: `user: process.env.DB_USER || 'hotdog'`,
    description: '修复硬编码的用户名'
  },
  {
    pattern: /username:\s*['"]hotdog['"]/g,
    replacement: `username: process.env.DB_USERNAME || 'hotdog'`,
    description: '修复硬编码的用户名'
  },
  {
    pattern: /password:\s*['"]Zhkj@62102218['"]/g,
    replacement: `password: process.env.DB_PASSWORD || 'Zhkj@62102218'`,
    description: '修复硬编码的密码'
  },
  {
    pattern: /database:\s*['"]cyrg2025['"]/g,
    replacement: `database: process.env.DB_NAME || 'cyrg2025'`,
    description: '修复硬编码的 cyrg2025 数据库名'
  },
  {
    pattern: /database:\s*['"]hotdog2030['"]/g,
    replacement: `database: process.env.DB_NAME || 'hotdog2030'`,
    description: '修复硬编码的 hotdog2030 数据库名'
  }
];

function shouldExcludeFile(filePath) {
  const fileName = path.basename(filePath);
  return EXCLUDE_FILES.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(fileName);
    }
    return fileName === pattern;
  });
}

function shouldExcludeDir(dirName) {
  return EXCLUDE_DIRS.includes(dirName);
}

function scanAndFixDirectory(dirPath, results = { fixed: [], errors: [], files: [] }) {
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!shouldExcludeDir(item)) {
          scanAndFixDirectory(fullPath, results);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (FILE_EXTENSIONS.includes(ext) && !shouldExcludeFile(item)) {
          results.files.push(fullPath);
          fixFile(fullPath, results);
        }
      }
    }
  } catch (error) {
    console.error(`扫描目录 ${dirPath} 时出错:`, error.message);
  }
  
  return results;
}

function fixFile(filePath, results) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fileFixed = false;
    
    FIX_RULES.forEach((rule, index) => {
      if (rule.pattern.test(content)) {
        content = content.replace(rule.pattern, rule.replacement);
        fileFixed = true;
        console.log(`  ✓ 应用规则 ${index + 1}: ${rule.description}`);
      }
    });
    
    if (fileFixed) {
      fs.writeFileSync(filePath, content, 'utf8');
      results.fixed.push({
        file: filePath,
        description: '已修复硬编码配置'
      });
      console.log(`✅ 已修复: ${filePath}`);
    }
  } catch (error) {
    console.error(`修复文件 ${filePath} 时出错:`, error.message);
    results.errors.push({
      file: filePath,
      error: error.message
    });
  }
}

function printResults(results) {
  console.log('\n' + '='.repeat(80));
  console.log('数据库配置修复报告');
  console.log('='.repeat(80));
  
  console.log(`\n📁 扫描的文件数量: ${results.files.length}`);
  console.log(`✅ 修复的文件数量: ${results.fixed.length}`);
  console.log(`❌ 错误数量: ${results.errors.length}`);
  
  if (results.fixed.length > 0) {
    console.log(`\n✅ 已修复的文件:`);
    console.log('-'.repeat(80));
    results.fixed.forEach(item => {
      console.log(`📄 ${item.file}`);
    });
  }
  
  if (results.errors.length > 0) {
    console.log(`\n❌ 修复失败的文件:`);
    console.log('-'.repeat(80));
    results.errors.forEach(item => {
      console.log(`📄 ${item.file}: ${item.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (results.fixed.length > 0) {
    console.log('\n🎉 修复完成！建议:');
    console.log('1. 检查修复后的文件是否正确');
    console.log('2. 确保 .env 文件包含所有必要的环境变量');
    console.log('3. 运行测试确保功能正常');
  } else {
    console.log('\n📝 没有发现需要修复的硬编码配置');
  }
}

// 主函数
function main() {
  console.log('🔧 开始修复数据库配置...\n');
  
  // 扫描并修复当前目录
  const results = scanAndFixDirectory('.');
  
  printResults(results);
  
  return results;
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { main, scanAndFixDirectory, fixFile }; 