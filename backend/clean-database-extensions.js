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

async function cleanDatabaseExtensions() {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功！');

    // 1. 首先查询所有MS_Description扩展属性
    console.log('\n正在查询MS_Description扩展属性...');
    const [msDescriptions] = await sequelize.query(`
      SELECT 
        ep.major_id,
        ep.minor_id,
        ep.name,
        ep.value,
        OBJECT_NAME(ep.major_id) as object_name,
        COL_NAME(ep.major_id, ep.minor_id) as column_name
      FROM sys.extended_properties ep
      WHERE ep.class = 1 AND ep.name = 'MS_Description'
      ORDER BY OBJECT_NAME(ep.major_id), COL_NAME(ep.major_id, ep.minor_id)
    `);

    console.log(`发现 ${msDescriptions.length} 个MS_Description扩展属性`);

    if (msDescriptions.length === 0) {
      console.log('没有发现MS_Description扩展属性，无需清理');
      return;
    }

    // 2. 逐个删除MS_Description扩展属性
    console.log('\n开始清理MS_Description扩展属性...');
    let successCount = 0;
    let errorCount = 0;

    for (const prop of msDescriptions) {
      try {
        let sql;
        if (prop.column_name) {
          // 删除列的扩展属性
          sql = `EXEC sp_dropextendedproperty @name = 'MS_Description', @level0type = 'Schema', @level0name = 'dbo', @level1type = 'Table', @level1name = '${prop.object_name}', @level2type = 'Column', @level2name = '${prop.column_name}'`;
        } else {
          // 删除表的扩展属性
          sql = `EXEC sp_dropextendedproperty @name = 'MS_Description', @level0type = 'Schema', @level0name = 'dbo', @level1type = 'Table', @level1name = '${prop.object_name}'`;
        }

        await sequelize.query(sql);
        console.log(`✓ 已删除: ${prop.object_name}${prop.column_name ? '.' + prop.column_name : ''}`);
        successCount++;
      } catch (error) {
        console.log(`✗ 删除失败: ${prop.object_name}${prop.column_name ? '.' + prop.column_name : ''} - ${error.message}`);
        errorCount++;
      }
    }

    // 3. 查询其他扩展属性
    console.log('\n正在查询其他扩展属性...');
    const [otherProps] = await sequelize.query(`
      SELECT 
        ep.major_id,
        ep.minor_id,
        ep.name,
        ep.value,
        OBJECT_NAME(ep.major_id) as object_name,
        COL_NAME(ep.major_id, ep.minor_id) as column_name
      FROM sys.extended_properties ep
      WHERE ep.class = 1 AND ep.name != 'MS_Description'
      ORDER BY ep.name, OBJECT_NAME(ep.major_id), COL_NAME(ep.major_id, ep.minor_id)
    `);

    console.log(`发现 ${otherProps.length} 个其他扩展属性`);

    if (otherProps.length > 0) {
      console.log('\n其他扩展属性列表:');
      const nameGroups = {};
      otherProps.forEach(prop => {
        if (!nameGroups[prop.name]) {
          nameGroups[prop.name] = [];
        }
        nameGroups[prop.name].push(prop);
      });

      Object.keys(nameGroups).forEach(name => {
        console.log(`${name}: ${nameGroups[name].length} 个`);
      });

      // 询问是否删除其他扩展属性
      console.log('\n是否要删除其他扩展属性？(这可能需要手动确认)');
    }

    // 4. 最终验证
    console.log('\n正在验证清理结果...');
    const [remainingProps] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM sys.extended_properties ep
      WHERE ep.class = 1 AND ep.name = 'MS_Description'
    `);

    console.log(`清理完成！剩余MS_Description扩展属性: ${remainingProps[0].count} 个`);
    console.log(`成功删除: ${successCount} 个`);
    console.log(`删除失败: ${errorCount} 个`);

    await sequelize.close();
    console.log('\n数据库连接已关闭');

  } catch (error) {
    console.error('错误:', error.message);
    if (sequelize) {
      await sequelize.close();
    }
  }
}

cleanDatabaseExtensions(); 