const sql = require('mssql');

async function checkDatabaseMigration() {
  console.log('=' .repeat(60));
  console.log('📊 数据库复制和迁移状态检查');
  console.log('=' .repeat(60));
  
  const config = {
    server: 'localhost',
    port: 1433,
    user: 'sa',
    password: 'YourStrong@Passw0rd',
    database: 'master',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: 10000,
      requestTimeout: 30000
    }
  };

  try {
    const pool = await sql.connect(config);
    
    // 1. 检查数据库是否存在
    console.log('\n📋 数据库状态:');
    console.log('-'.repeat(60));
    const databases = await pool.request().query(`
      SELECT 
        name,
        state_desc,
        create_date,
        compatibility_level
      FROM sys.databases 
      WHERE name IN ('cyrg2025', 'cyrgweixin', 'hotdog2030')
      ORDER BY name
    `);
    
    databases.recordset.forEach(db => {
      const icon = db.state_desc === 'ONLINE' ? '✅' : '❌';
      console.log(`${icon} ${db.name}: ${db.state_desc} (创建时间: ${db.create_date.toLocaleString('zh-CN')})`);
    });
    
    // 2. 检查数据库文件大小
    console.log('\n📁 数据库文件大小:');
    console.log('-'.repeat(60));
    const fileSizes = await pool.request().query(`
      SELECT 
        DB_NAME(database_id) as database_name,
        name as logical_name,
        physical_name,
        CAST(size * 8.0 / 1024 AS DECIMAL(10,2)) as size_mb,
        type_desc
      FROM sys.master_files 
      WHERE DB_NAME(database_id) IN ('cyrg2025', 'cyrgweixin', 'hotdog2030')
      ORDER BY database_name, file_id
    `);
    
    let currentDb = null;
    fileSizes.recordset.forEach(file => {
      if (file.database_name !== currentDb) {
        console.log(`\n${file.database_name}:`);
        currentDb = file.database_name;
      }
      console.log(`  ${file.logical_name} (${file.type_desc}): ${file.size_mb} MB`);
    });
    
    // 3. 检查hotdog2030数据库的表结构和数据量
    console.log('\n📊 hotdog2030 数据库表统计:');
    console.log('-'.repeat(60));
    
    await pool.request().query('USE hotdog2030');
    
    const tables = await pool.request().query(`
      SELECT 
        t.name as table_name,
        p.rows as row_count
      FROM sys.tables t
      INNER JOIN sys.partitions p ON t.object_id = p.object_id
      WHERE p.index_id IN (0,1)
      ORDER BY t.name
    `);
    
    let totalRows = 0;
    tables.recordset.forEach(table => {
      const count = parseInt(table.row_count) || 0;
      totalRows += count;
      const icon = count > 0 ? '✅' : '⚠️';
      console.log(`${icon} ${table.table_name}: ${count.toLocaleString('zh-CN')} 条记录`);
    });
    
    console.log(`\n📊 总计: ${totalRows.toLocaleString('zh-CN')} 条记录`);
    
    // 4. 检查源数据库 (cyrg2025) 的关键表
    console.log('\n📋 源数据库 (cyrg2025) 关键表统计:');
    console.log('-'.repeat(60));
    
    try {
      await pool.request().query('USE cyrg2025');
      
      const sourceTables = ['Orders', 'Order_Details', 'Stores', 'Products', 'Categories'];
      for (const tableName of sourceTables) {
        try {
          const result = await pool.request().query(`SELECT COUNT(*) as count FROM ${tableName}`);
          const count = result.recordset[0].count;
          console.log(`✅ ${tableName}: ${count.toLocaleString('zh-CN')} 条记录`);
        } catch (err) {
          console.log(`⚠️ ${tableName}: 无法访问 (${err.message})`);
        }
      }
    } catch (err) {
      console.log(`❌ 无法访问 cyrg2025 数据库: ${err.message}`);
    }
    
    // 5. 检查 cyrgweixin 数据库 (如果存在)
    console.log('\n📋 源数据库 (cyrgweixin) 关键表统计:');
    console.log('-'.repeat(60));
    
    try {
      await pool.request().query('USE cyrgweixin');
      
      const sourceTables = ['Orders', 'Order_Details', 'Stores', 'Products'];
      for (const tableName of sourceTables) {
        try {
          const result = await pool.request().query(`SELECT COUNT(*) as count FROM ${tableName}`);
          const count = result.recordset[0].count;
          console.log(`✅ ${tableName}: ${count.toLocaleString('zh-CN')} 条记录`);
        } catch (err) {
          console.log(`⚠️ ${tableName}: 无法访问 (${err.message})`);
        }
      }
    } catch (err) {
      console.log(`⚠️ cyrgweixin 数据库不存在或无法访问`);
    }
    
    // 6. 检查迁移状态对比
    console.log('\n📊 数据迁移对比分析:');
    console.log('-'.repeat(60));
    
    try {
      // 检查订单数据迁移
      await pool.request().query('USE cyrg2025');
      const sourceOrders = await pool.request().query('SELECT COUNT(*) as count FROM Orders');
      const sourceOrdersCount = sourceOrders.recordset[0].count;
      
      await pool.request().query('USE hotdog2030');
      const targetOrders = await pool.request().query('SELECT COUNT(*) as count FROM orders WHERE delflag = 0');
      const targetOrdersCount = targetOrders.recordset[0].count;
      
      const ordersMigrationRate = sourceOrdersCount > 0 ? 
        ((targetOrdersCount / sourceOrdersCount) * 100).toFixed(2) : 0;
      
      console.log(`订单数据迁移:`);
      console.log(`  源数据库 (cyrg2025.Orders): ${sourceOrdersCount.toLocaleString('zh-CN')} 条`);
      console.log(`  目标数据库 (hotdog2030.orders): ${targetOrdersCount.toLocaleString('zh-CN')} 条`);
      console.log(`  迁移比率: ${ordersMigrationRate}%`);
      
      // 检查门店数据迁移
      await pool.request().query('USE cyrg2025');
      const sourceStores = await pool.request().query('SELECT COUNT(*) as count FROM Stores');
      const sourceStoresCount = sourceStores.recordset[0].count;
      
      await pool.request().query('USE hotdog2030');
      const targetStores = await pool.request().query('SELECT COUNT(*) as count FROM stores WHERE delflag = 0');
      const targetStoresCount = targetStores.recordset[0].count;
      
      const storesMigrationRate = sourceStoresCount > 0 ? 
        ((targetStoresCount / sourceStoresCount) * 100).toFixed(2) : 0;
      
      console.log(`\n门店数据迁移:`);
      console.log(`  源数据库 (cyrg2025.Stores): ${sourceStoresCount.toLocaleString('zh-CN')} 条`);
      console.log(`  目标数据库 (hotdog2030.stores): ${targetStoresCount.toLocaleString('zh-CN')} 条`);
      console.log(`  迁移比率: ${storesMigrationRate}%`);
      
    } catch (err) {
      console.log(`⚠️ 无法进行迁移对比: ${err.message}`);
    }
    
    await pool.close();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 数据库检查完成！');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ 检查过程发生错误:');
    console.error('错误信息:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 可能的解决方案:');
      console.log('1. 确保SQL Server服务正在运行');
      console.log('2. 检查Docker容器是否启动: docker ps');
      console.log('3. 检查端口1433是否可访问');
    }
  }
}

// 运行检查
checkDatabaseMigration();

