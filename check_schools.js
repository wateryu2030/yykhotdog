const path = require('path');
const fs = require('fs');
const sql = require('mssql');

// 加载环境变量
const envPath = path.join(__dirname, 'dev.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

// 加载mssql模块
const backendNodeModules = path.join(__dirname, 'backend', 'node_modules');
const mssqlPath = path.join(backendNodeModules, 'mssql');
if (fs.existsSync(mssqlPath)) {
  const Module = require('module');
  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function(request, parent) {
    if (request === 'mssql') {
      return path.join(backendNodeModules, 'mssql', 'index.js');
    }
    return originalResolveFilename.apply(this, arguments);
  };
}

async function checkSchools() {
  let pool = null;
  try {
    const dbConfig = {
      server: process.env.DB_HOST || process.env.CARGO_DB_HOST,
      port: parseInt(process.env.DB_PORT || '1433'),
      database: 'hotdog2030',
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
      }
    };

    console.log('🔌 连接数据库...');
    pool = await sql.connect(dbConfig);
    console.log('✅ 数据库连接成功\n');

    // 检查表是否存在
    console.log('📋 检查表是否存在...');
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'school_basic_info'
    `);
    console.log(`表 school_basic_info 存在: ${tableCheck.recordset[0].count > 0 ? '是' : '否'}\n`);

    // 查询天津市和平区的学校数据
    console.log('📊 查询天津市和平区的学校数据...');
    const result = await pool.request()
      .input('city', sql.NVarChar, '天津市')
      .input('district', sql.NVarChar, '和平区')
      .query(`
        SELECT 
          id, school_name, school_type, city, district,
          latitude, longitude, student_count
        FROM school_basic_info
        WHERE city = @city AND district = @district
          AND ISNULL(delflag, 0) = 0
        ORDER BY student_count DESC
      `);

    console.log(`找到 ${result.recordset.length} 所学校\n`);

    if (result.recordset.length > 0) {
      console.log('前5所学校信息：');
      result.recordset.slice(0, 5).forEach((school, index) => {
        console.log(`${index + 1}. ${school.school_name}`);
        console.log(`   类型: ${school.school_type}`);
        console.log(`   位置: ${school.city} ${school.district}`);
        console.log(`   坐标: ${school.latitude}, ${school.longitude}`);
        console.log(`   学生数: ${school.student_count || '未设置'}`);
        console.log('');
      });
    } else {
      // 检查是否有其他城市名称格式
      console.log('⚠️ 未找到数据，尝试查询所有学校...');
      const allSchools = await pool.request().query(`
        SELECT DISTINCT city, district, COUNT(*) as count
        FROM school_basic_info
        WHERE ISNULL(delflag, 0) = 0
        GROUP BY city, district
        ORDER BY city, district
      `);
      console.log('数据库中的所有城市和区县：');
      allSchools.recordset.forEach(row => {
        console.log(`  ${row.city} - ${row.district} (${row.count}所)`);
      });
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

checkSchools();
