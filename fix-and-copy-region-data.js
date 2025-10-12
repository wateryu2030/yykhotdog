const sql = require('mssql');

// RDS数据库配置
const rdsConfig = {
  server: 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: 1433,
  user: 'hotdog',
  password: 'Zhkj@62102218',
  database: 'hotdog2030',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    connectTimeout: 30000,
    requestTimeout: 60000
  }
};

// 本地数据库配置
const localConfig = {
  server: 'localhost',
  port: 1433,
  user: 'sa',
  password: 'YourStrong@Passw0rd',
  database: 'hotdog2030',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 10000,
    requestTimeout: 30000
  }
};

async function checkLocalTableStructure(tableName) {
  console.log(`\n🔍 检查本地表 ${tableName} 的结构...`);
  
  try {
    const pool = await sql.connect(localConfig);
    
    const result = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMNPROPERTY(OBJECT_ID(TABLE_NAME), COLUMN_NAME, 'IsIdentity') as IS_IDENTITY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${tableName}'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('本地字段:');
    result.recordset.forEach(col => {
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      const identity = col.IS_IDENTITY === 1 ? ' [IDENTITY]' : '';
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} ${nullable}${identity}`);
    });
    
    await pool.close();
    return result.recordset;
  } catch (error) {
    console.error(`❌ 检查表结构失败: ${error.message}`);
    return [];
  }
}

async function addMissingColumns() {
  console.log('\n🔧 添加缺失的字段...');
  
  try {
    const pool = await sql.connect(localConfig);
    
    // 检查region_hierarchy表是否缺少full_name字段
    const checkColumn = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'region_hierarchy' AND COLUMN_NAME = 'full_name'
    `);
    
    if (checkColumn.recordset[0].count === 0) {
      console.log('📝 为region_hierarchy表添加full_name字段...');
      await pool.request().query(`
        ALTER TABLE region_hierarchy
        ADD full_name NVARCHAR(200) NULL
      `);
      console.log('✅ full_name字段添加成功');
    } else {
      console.log('✅ region_hierarchy表已有full_name字段');
    }
    
    await pool.close();
    return true;
  } catch (error) {
    console.error(`❌ 添加字段失败: ${error.message}`);
    return false;
  }
}

async function copyRegionHierarchyData() {
  console.log('\n🔄 开始复制 region_hierarchy 表数据...');
  console.log('-'.repeat(60));
  
  try {
    const rdsPool = await sql.connect(rdsConfig);
    const localPool = new sql.ConnectionPool(localConfig);
    await localPool.connect();
    
    // 获取RDS数据
    console.log('📥 从RDS读取 region_hierarchy 数据...');
    const rdsData = await rdsPool.request().query(`
      SELECT code, name, level, parent_code, full_name, sort_order, is_active, created_at, updated_at
      FROM region_hierarchy
      ORDER BY level, sort_order
    `);
    
    const dataCount = rdsData.recordset.length;
    console.log(`📊 从RDS获取到 ${dataCount} 条记录`);
    
    if (dataCount === 0) {
      console.log('⚠️ RDS中 region_hierarchy 表为空');
      await localPool.close();
      await rdsPool.close();
      return false;
    }
    
    // 显示统计信息
    const stats = {};
    rdsData.recordset.forEach(row => {
      const level = row.level;
      stats[level] = (stats[level] || 0) + 1;
    });
    console.log('层级统计:');
    Object.keys(stats).sort().forEach(level => {
      const levelName = level == 1 ? '省级' : level == 2 ? '市级' : level == 3 ? '区县级' : `级别${level}`;
      console.log(`  ${levelName}: ${stats[level]} 条`);
    });
    
    // 清空本地表
    console.log('🗑️ 清空本地 region_hierarchy 表...');
    await localPool.request().query('DELETE FROM region_hierarchy');
    
    // 关闭IDENTITY_INSERT（如果有自增列）
    try {
      await localPool.request().query('SET IDENTITY_INSERT region_hierarchy ON');
    } catch (e) {
      // 如果没有自增列，忽略错误
    }
    
    // 批量插入数据
    console.log('📥 插入数据到本地数据库...');
    const batchSize = 100;
    let insertedCount = 0;
    
    const insertSQL = `
      INSERT INTO region_hierarchy (code, name, level, parent_code, full_name, sort_order, is_active, created_at, updated_at)
      VALUES (@code, @name, @level, @parent_code, @full_name, @sort_order, @is_active, @created_at, @updated_at)
    `;
    
    for (let i = 0; i < dataCount; i++) {
      const row = rdsData.recordset[i];
      const request = localPool.request();
      
      request.input('code', sql.NVarChar(20), row.code);
      request.input('name', sql.NVarChar(100), row.name);
      request.input('level', sql.Int, row.level);
      request.input('parent_code', sql.NVarChar(20), row.parent_code);
      request.input('full_name', sql.NVarChar(200), row.full_name);
      request.input('sort_order', sql.Int, row.sort_order);
      request.input('is_active', sql.TinyInt, row.is_active);
      request.input('created_at', sql.DateTime2, row.created_at);
      request.input('updated_at', sql.DateTime2, row.updated_at);
      
      await request.query(insertSQL);
      insertedCount++;
      
      if (insertedCount % batchSize === 0 || insertedCount === dataCount) {
        console.log(`✅ 已插入 ${insertedCount}/${dataCount} 条记录 (${((insertedCount/dataCount)*100).toFixed(1)}%)`);
      }
    }
    
    // 关闭IDENTITY_INSERT
    try {
      await localPool.request().query('SET IDENTITY_INSERT region_hierarchy OFF');
    } catch (e) {
      // 忽略
    }
    
    // 验证数据
    const verifyResult = await localPool.request().query('SELECT COUNT(*) as count FROM region_hierarchy');
    const localCount = verifyResult.recordset[0].count;
    console.log(`✅ 本地 region_hierarchy 表现有 ${localCount} 条记录`);
    
    // 验证各层级数据
    const levelCheck = await localPool.request().query(`
      SELECT level, COUNT(*) as count
      FROM region_hierarchy
      WHERE is_active = 1
      GROUP BY level
      ORDER BY level
    `);
    console.log('\n本地数据层级统计:');
    levelCheck.recordset.forEach(row => {
      const levelName = row.level == 1 ? '省级' : row.level == 2 ? '市级' : row.level == 3 ? '区县级' : `级别${row.level}`;
      console.log(`  ${levelName}: ${row.count} 条`);
    });
    
    await localPool.close();
    await rdsPool.close();
    
    return true;
    
  } catch (error) {
    console.error(`❌ 复制 region_hierarchy 数据失败: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

async function copyCityData() {
  console.log('\n🔄 开始复制 city 表数据...');
  console.log('-'.repeat(60));
  
  try {
    const rdsPool = await sql.connect(rdsConfig);
    const localPool = new sql.ConnectionPool(localConfig);
    await localPool.connect();
    
    // 获取RDS数据（不包括id列）
    console.log('📥 从RDS读取 city 数据...');
    const rdsData = await rdsPool.request().query(`
      SELECT city_name, province, region, created_at, updated_at, delflag
      FROM city
      ORDER BY id
    `);
    
    const dataCount = rdsData.recordset.length;
    console.log(`📊 从RDS获取到 ${dataCount} 条记录`);
    
    if (dataCount === 0) {
      console.log('⚠️ RDS中 city 表为空');
      await localPool.close();
      await rdsPool.close();
      return false;
    }
    
    // 清空本地表
    console.log('🗑️ 清空本地 city 表...');
    await localPool.request().query('DELETE FROM city');
    
    // 插入数据（不包括id，让数据库自动生成）
    console.log('📥 插入数据到本地数据库...');
    
    const insertSQL = `
      INSERT INTO city (city_name, province, region, created_at, updated_at, delflag)
      VALUES (@city_name, @province, @region, @created_at, @updated_at, @delflag)
    `;
    
    for (let i = 0; i < dataCount; i++) {
      const row = rdsData.recordset[i];
      const request = localPool.request();
      
      request.input('city_name', sql.NVarChar(50), row.city_name);
      request.input('province', sql.NVarChar(50), row.province);
      request.input('region', sql.NVarChar(100), row.region);
      request.input('created_at', sql.DateTime, row.created_at);
      request.input('updated_at', sql.DateTime, row.updated_at);
      request.input('delflag', sql.TinyInt, row.delflag);
      
      await request.query(insertSQL);
      console.log(`✅ 已插入 ${i+1}/${dataCount} 条记录`);
    }
    
    // 验证数据
    const verifyResult = await localPool.request().query('SELECT * FROM city');
    console.log(`✅ 本地 city 表现有 ${verifyResult.recordset.length} 条记录`);
    console.log('\n本地city表数据:');
    verifyResult.recordset.forEach(row => {
      console.log(`  ${row.city_name} (${row.province})`);
    });
    
    await localPool.close();
    await rdsPool.close();
    
    return true;
    
  } catch (error) {
    console.error(`❌ 复制 city 数据失败: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

async function showSampleData() {
  console.log('\n📋 查看本地数据样例...');
  console.log('-'.repeat(60));
  
  try {
    const pool = await sql.connect(localConfig);
    
    // 显示省级数据
    console.log('\n省级地区 (level=1):');
    const provinces = await pool.request().query(`
      SELECT TOP 10 code, name, full_name
      FROM region_hierarchy
      WHERE level = 1 AND is_active = 1
      ORDER BY sort_order
    `);
    provinces.recordset.forEach(row => {
      console.log(`  ${row.code}: ${row.name}`);
    });
    
    // 显示某个省的市级数据
    console.log('\n北京市的区县 (parent_code=11):');
    const cities = await pool.request().query(`
      SELECT code, name, full_name
      FROM region_hierarchy
      WHERE parent_code = '11' AND is_active = 1
      ORDER BY sort_order
    `);
    cities.recordset.forEach(row => {
      console.log(`  ${row.code}: ${row.name}`);
    });
    
    await pool.close();
  } catch (error) {
    console.error(`❌ 查看数据失败: ${error.message}`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🌍 从RDS复制省市区县级联数据到本地数据库');
  console.log('='.repeat(60));
  
  // 检查本地表结构
  await checkLocalTableStructure('region_hierarchy');
  await checkLocalTableStructure('city');
  
  // 添加缺失的字段
  if (!await addMissingColumns()) {
    console.log('❌ 添加字段失败');
    process.exit(1);
  }
  
  // 复制数据
  let successCount = 0;
  
  if (await copyRegionHierarchyData()) {
    successCount++;
  }
  
  if (await copyCityData()) {
    successCount++;
  }
  
  // 显示样例数据
  if (successCount > 0) {
    await showSampleData();
  }
  
  console.log('\n' + '='.repeat(60));
  if (successCount === 2) {
    console.log('🎉 所有数据复制完成！');
    console.log('\n📊 数据统计:');
    console.log('  ✅ region_hierarchy: 省市区县级联数据');
    console.log('  ✅ city: 城市数据');
  } else if (successCount > 0) {
    console.log(`⚠️ 部分数据复制完成 (${successCount}/2)`);
  } else {
    console.log('❌ 数据复制失败');
  }
  console.log('='.repeat(60));
}

// 运行主函数
main().catch(error => {
  console.error('❌ 执行过程发生错误:', error);
  process.exit(1);
});

