const { Sequelize } = require('sequelize');

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

async function cleanDatabaseSimple() {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 简单的清理脚本 - 删除所有MS_Description扩展属性
    const cleanupQueries = [
      // 删除所有MS_Description扩展属性
      `DECLARE @sql NVARCHAR(MAX) = '';
      SELECT @sql = @sql + 'EXEC sp_dropextendedproperty @name = ''MS_Description'', @level0type = ''' + level0type + ''', @level0name = ''' + level0name + ''';' + CHAR(13)
      FROM sys.extended_properties
      WHERE class = 1 AND name = 'MS_Description';
      EXEC sp_executesql @sql;`,
      
      // 删除所有其他扩展属性
      `DECLARE @sql NVARCHAR(MAX) = '';
      SELECT @sql = @sql + 'EXEC sp_dropextendedproperty @name = ''' + name + ''', @level0type = ''' + level0type + ''', @level0name = ''' + level0name + ''';' + CHAR(13)
      FROM sys.extended_properties
      WHERE class = 1 AND name != 'MS_Description';
      EXEC sp_executesql @sql;`
    ];

    console.log('开始清理数据库扩展属性...');
    
    for (let i = 0; i < cleanupQueries.length; i++) {
      try {
        console.log(`执行清理脚本 ${i + 1}/${cleanupQueries.length}...`);
        await sequelize.query(cleanupQueries[i]);
        console.log(`清理脚本 ${i + 1} 执行成功`);
      } catch (error) {
        console.log(`清理脚本 ${i + 1} 执行时出现错误（可能是正常的）:`, error.message);
      }
    }

    // 验证清理结果
    try {
      const [results] = await sequelize.query(`
        SELECT COUNT(*) as remaining_properties
        FROM sys.extended_properties
        WHERE class = 1
      `);
      
      console.log(`清理完成！剩余扩展属性数量: ${results[0].remaining_properties}`);
      
      if (results[0].remaining_properties === 0) {
        console.log('✅ 所有扩展属性已成功清理！');
      } else {
        console.log('⚠️  仍有部分扩展属性存在');
      }
    } catch (error) {
      console.log('无法验证清理结果，但清理脚本已执行完成');
    }

  } catch (error) {
    console.error('清理过程中出现错误:', error);
  } finally {
    await sequelize.close();
    console.log('数据库连接已关闭');
  }
}

// 执行清理
cleanDatabaseSimple(); 