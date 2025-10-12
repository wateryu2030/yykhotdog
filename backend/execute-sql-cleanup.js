const { Sequelize } = require('sequelize');
const fs = require('fs');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.DB_PORT || '1433'),
  username: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  database: process.env.DB_NAME || 'cyrg2025',
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  }
};

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    dialectOptions: dbConfig.dialectOptions,
    logging: false
  }
);

async function executeSqlCleanup() {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 读取SQL文件
    const sqlContent = fs.readFileSync('./clean-database-direct.sql', 'utf8');
    
    // 分割SQL语句（按GO分割）
    const sqlStatements = sqlContent
      .split('GO')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`找到 ${sqlStatements.length} 个SQL语句`);

    // 执行每个SQL语句
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      if (statement.trim()) {
        try {
          console.log(`执行SQL语句 ${i + 1}/${sqlStatements.length}...`);
          console.log(`SQL: ${statement.substring(0, 100)}...`);
          
          const result = await sequelize.query(statement);
          console.log(`✅ SQL语句 ${i + 1} 执行成功`);
          
        } catch (error) {
          console.log(`❌ SQL语句 ${i + 1} 执行失败: ${error.message}`);
        }
      }
    }

    // 验证清理结果
    try {
      const [results] = await sequelize.query(`
        SELECT COUNT(*) as remaining_properties
        FROM sys.extended_properties
        WHERE class = 1
      `);
      
      console.log(`\n清理完成！剩余扩展属性数量: ${results[0].remaining_properties}`);
      
      if (results[0].remaining_properties === 0) {
        console.log('✅ 所有扩展属性已成功清理！');
      } else {
        console.log('⚠️  仍有部分扩展属性存在');
      }
    } catch (error) {
      console.log('无法验证清理结果，但清理脚本已执行完成');
    }

  } catch (error) {
    console.error('执行过程中出现错误:', error);
  } finally {
    await sequelize.close();
    console.log('数据库连接已关闭');
  }
}

// 执行清理
executeSqlCleanup(); 