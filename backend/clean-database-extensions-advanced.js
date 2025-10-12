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

async function cleanDatabaseExtensionsAdvanced() {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 首先查看现有的扩展属性
    console.log('查看现有扩展属性...');
    const [properties] = await sequelize.query(`
      SELECT 
        ep.name,
        ep.value,
        ep.level0type,
        ep.level0name,
        ep.level1type,
        ep.level1name,
        ep.level2type,
        ep.level2name
      FROM sys.extended_properties ep
      WHERE ep.class = 1
      ORDER BY ep.level0name, ep.level1name, ep.level2name
    `);
    
    console.log(`发现 ${properties.length} 个扩展属性:`);
    properties.forEach((prop, index) => {
      console.log(`${index + 1}. ${prop.name} = ${prop.value} (${prop.level0type}:${prop.level0name}${prop.level1type ? '/' + prop.level1type + ':' + prop.level1name : ''}${prop.level2type ? '/' + prop.level2type + ':' + prop.level2name : ''})`);
    });

    if (properties.length === 0) {
      console.log('✅ 没有发现需要清理的扩展属性！');
      return;
    }

    console.log('\n开始逐个删除扩展属性...');
    
    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i];
      try {
        let dropQuery = `EXEC sp_dropextendedproperty @name = '${prop.name}', @level0type = '${prop.level0type}', @level0name = '${prop.level0name}'`;
        
        if (prop.level1type) {
          dropQuery += `, @level1type = '${prop.level1type}', @level1name = '${prop.level1name}'`;
        }
        
        if (prop.level2type) {
          dropQuery += `, @level2type = '${prop.level2type}', @level2name = '${prop.level2name}'`;
        }
        
        dropQuery += ';';
        
        console.log(`删除 ${i + 1}/${properties.length}: ${prop.name}...`);
        await sequelize.query(dropQuery);
        console.log(`✅ 成功删除: ${prop.name}`);
        
      } catch (error) {
        console.log(`❌ 删除失败 ${prop.name}: ${error.message}`);
      }
    }

    // 验证清理结果
    const [remaining] = await sequelize.query(`
      SELECT COUNT(*) as remaining_properties
      FROM sys.extended_properties
      WHERE class = 1
    `);
    
    console.log(`\n清理完成！剩余扩展属性数量: ${remaining[0].remaining_properties}`);
    
    if (remaining[0].remaining_properties === 0) {
      console.log('✅ 所有扩展属性已成功清理！');
    } else {
      console.log('⚠️  仍有部分扩展属性存在，显示剩余属性:');
      const [remainingProps] = await sequelize.query(`
        SELECT 
          ep.name,
          ep.value,
          ep.level0type,
          ep.level0name,
          ep.level1type,
          ep.level1name
        FROM sys.extended_properties ep
        WHERE ep.class = 1
      `);
      
      remainingProps.forEach((prop, index) => {
        console.log(`${index + 1}. ${prop.name} = ${prop.value} (${prop.level0type}:${prop.level0name}${prop.level1type ? '/' + prop.level1type + ':' + prop.level1name : ''})`);
      });
    }

  } catch (error) {
    console.error('清理过程中出现错误:', error);
  } finally {
    await sequelize.close();
    console.log('数据库连接已关闭');
  }
}

// 执行清理
cleanDatabaseExtensionsAdvanced(); 