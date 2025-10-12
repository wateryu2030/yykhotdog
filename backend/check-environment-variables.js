const fs = require('fs');
const path = require('path');

// 需要检查的文件类型
const FILE_EXTENSIONS = ['.js', '.ts', '.tsx'];
// 需要排除的目录
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage'];
// 需要排除的文件
const EXCLUDE_FILES = ['package-lock.json', 'yarn.lock', '*.min.js'];

// 硬编码的数据库连接信息
const HARDCODED_PATTERNS = [
  {
    pattern: /rm-uf660d00xovkm30678o\.sqlserver\.rds\.aliyuncs\.com/,
    description: '硬编码的数据库主机地址'
  },
  {
    pattern: /server.*localhost/,
    description: '硬编码的localhost服务器地址'
  },
  {
    pattern: /host.*localhost/,
    description: '硬编码的localhost主机地址'
  },
  {
    pattern: /user.*['"]hotdog['"]/,
    description: '硬编码的数据库用户名'
  },
  {
    pattern: /password.*['"]Zhkj@62102218['"]/,
    description: '硬编码的数据库密码'
  },
  {
    pattern: /database.*['"]cyrg2025['"]/,
    description: '硬编码的cyrg2025数据库名'
  },
  {
    pattern: /database.*['"]hotdog2030['"]/,
    description: '硬编码的hotdog2030数据库名'
  },
  {
    pattern: /port.*1433/,
    description: '硬编码的数据库端口'
  }
];

// 环境变量模式
const ENV_PATTERNS = [
  {
    pattern: /process\.env\./,
    description: '使用环境变量'
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

function scanDirectory(dirPath, results = { hardcoded: [], envVars: [], files: [] }) {
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!shouldExcludeDir(item)) {
          scanDirectory(fullPath, results);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (FILE_EXTENSIONS.includes(ext) && !shouldExcludeFile(item)) {
          results.files.push(fullPath);
          analyzeFile(fullPath, results);
        }
      }
    }
  } catch (error) {
    console.error(`扫描目录 ${dirPath} 时出错:`, error.message);
  }
  
  return results;
}

function analyzeFile(filePath, results) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, lineNumber) => {
      const lineNum = lineNumber + 1;
      
      // 检查硬编码模式
      HARDCODED_PATTERNS.forEach(pattern => {
        if (pattern.pattern.test(line)) {
          results.hardcoded.push({
            file: filePath,
            line: lineNum,
            content: line.trim(),
            description: pattern.description
          });
        }
      });
      
      // 检查环境变量模式
      ENV_PATTERNS.forEach(pattern => {
        if (pattern.pattern.test(line)) {
          results.envVars.push({
            file: filePath,
            line: lineNum,
            content: line.trim(),
            description: pattern.description
          });
        }
      });
    });
  } catch (error) {
    console.error(`分析文件 ${filePath} 时出错:`, error.message);
  }
}

function printResults(results) {
  console.log('='.repeat(80));
  console.log('数据库连接配置检查报告');
  console.log('='.repeat(80));
  
  console.log(`\n📁 扫描的文件数量: ${results.files.length}`);
  
  if (results.hardcoded.length > 0) {
    console.log(`\n❌ 发现 ${results.hardcoded.length} 个硬编码配置:`);
    console.log('-'.repeat(80));
    
    const grouped = results.hardcoded.reduce((acc, item) => {
      if (!acc[item.file]) {
        acc[item.file] = [];
      }
      acc[item.file].push(item);
      return acc;
    }, {});
    
    Object.keys(grouped).forEach(file => {
      console.log(`\n📄 ${file}:`);
      grouped[file].forEach(item => {
        console.log(`  第${item.line}行: ${item.description}`);
        console.log(`    ${item.content}`);
      });
    });
  } else {
    console.log('\n✅ 未发现硬编码的数据库配置');
  }
  
  if (results.envVars.length > 0) {
    console.log(`\n✅ 发现 ${results.envVars.length} 个环境变量使用:`);
    console.log('-'.repeat(80));
    
    const grouped = results.envVars.reduce((acc, item) => {
      if (!acc[item.file]) {
        acc[item.file] = [];
      }
      acc[item.file].push(item);
      return acc;
    }, {});
    
    Object.keys(grouped).forEach(file => {
      console.log(`\n📄 ${file}:`);
      grouped[file].forEach(item => {
        console.log(`  第${item.line}行: ${item.description}`);
        console.log(`    ${item.content}`);
      });
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  // 生成建议
  if (results.hardcoded.length > 0) {
    console.log('\n🔧 建议修复:');
    console.log('1. 将所有硬编码的数据库配置替换为环境变量');
    console.log('2. 在 .env 文件中定义所有数据库配置');
    console.log('3. 使用 process.env.VARIABLE_NAME 的方式访问配置');
    console.log('4. 为不同环境创建不同的 .env 文件');
  } else {
    console.log('\n🎉 所有数据库配置都正确使用了环境变量！');
  }
}

// 主函数
function main() {
  console.log('🔍 开始扫描数据库连接配置...\n');
  
  // 扫描当前目录
  const results = scanDirectory('.');
  
  printResults(results);
  
  // 返回结果用于后续处理
  return results;
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { main, scanDirectory, analyzeFile }; 