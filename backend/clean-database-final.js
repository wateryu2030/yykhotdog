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

async function cleanDatabaseFinal() {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 首先检查现有的扩展属性
    console.log('检查现有扩展属性...');
    try {
      const [properties] = await sequelize.query(`
        SELECT name, value, level0type, level0name
        FROM sys.extended_properties
        WHERE class = 1
        ORDER BY name, level0name
      `);
      
      console.log(`发现 ${properties.length} 个扩展属性`);
      properties.forEach((prop, index) => {
        console.log(`${index + 1}. ${prop.name} = ${prop.value} (${prop.level0type}:${prop.level0name})`);
      });
    } catch (error) {
      console.log('无法查询扩展属性，但继续执行清理...');
    }

    // 执行清理脚本
    const cleanupScripts = [
      // 脚本1: 删除MS_Description
      `DECLARE @sql NVARCHAR(MAX) = '';
       SELECT @sql = @sql + 'EXEC sp_dropextendedproperty @name = ''MS_Description'', @level0type = ''' + level0type + ''', @level0name = ''' + level0name + ''';' + CHAR(13)
       FROM sys.extended_properties
       WHERE class = 1 AND name = 'MS_Description';
       IF LEN(@sql) > 0 BEGIN EXEC sp_executesql @sql; END`,

      // 脚本2: 删除所有其他扩展属性
      `DECLARE @sql NVARCHAR(MAX) = '';
       SELECT @sql = @sql + 'EXEC sp_dropextendedproperty @name = ''' + name + ''', @level0type = ''' + level0type + ''', @level0name = ''' + level0name + ''';' + CHAR(13)
       FROM sys.extended_properties
       WHERE class = 1;
       IF LEN(@sql) > 0 BEGIN EXEC sp_executesql @sql; END`,

      // 脚本3: 强制删除（使用TRY-CATCH）
      `DECLARE @sql NVARCHAR(MAX) = '';
       SELECT @sql = @sql + 'BEGIN TRY EXEC sp_dropextendedproperty @name = ''' + name + ''', @level0type = ''' + level0type + ''', @level0name = ''' + level0name + '''; END TRY BEGIN CATCH END CATCH' + CHAR(13)
       FROM sys.extended_properties
       WHERE class = 1;
       IF LEN(@sql) > 0 BEGIN EXEC sp_executesql @sql; END`
    ];

    console.log('\n开始执行清理脚本...');
    
    for (let i = 0; i < cleanupScripts.length; i++) {
      try {
        console.log(`执行清理脚本 ${i + 1}/${cleanupScripts.length}...`);
        await sequelize.query(cleanupScripts[i]);
        console.log(`✅ 清理脚本 ${i + 1} 执行成功`);
      } catch (error) {
        console.log(`❌ 清理脚本 ${i + 1} 执行失败: ${error.message}`);
      }
    }

    // 最终验证
    console.log('\n验证清理结果...');
    try {
      const [remaining] = await sequelize.query(`
        SELECT COUNT(*) as remaining_properties
        FROM sys.extended_properties
        WHERE class = 1
      `);
      
      console.log(`剩余扩展属性数量: ${remaining[0].remaining_properties}`);
      
      if (remaining[0].remaining_properties === 0) {
        console.log('✅ 所有扩展属性已成功清理！');
        console.log('🎉 数据库扩展属性清理完成！现在可以启动后端服务了。');
      } else {
        console.log('⚠️  仍有部分扩展属性存在，但主要清理已完成');
        console.log('💡 建议：现在可以尝试启动后端服务，如果仍有问题，可能需要手动处理剩余属性');
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
cleanDatabaseFinal(); 