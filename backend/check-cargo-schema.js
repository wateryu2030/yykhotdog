const sql = require('mssql');

const config = {
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'hotdog2030',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkcyrg2025Schema() {
  let pool;
  try {
    console.log('=== 检查cyrg2025.dbo.Orders表结构 ===');
    
    console.log('1. 连接数据库...');
    pool = await sql.connect(config);
    console.log('✅ 数据库连接成功');
    
    console.log('\n2. 查询cyrg2025.dbo.Orders表的所有列...');
    const columnsResult = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        ORDINAL_POSITION
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Orders' 
        AND TABLE_SCHEMA = 'dbo'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('cyrg2025.dbo.Orders表结构:');
    columnsResult.recordset.forEach(col => {
      console.log(`  ${col.ORDINAL_POSITION}. ${col.COLUMN_NAME} (${col.DATA_TYPE}, ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    console.log('\n3. 查询cyrg2025.dbo.Orders表的前5条数据...');
    const dataResult = await pool.request().query(`
      SELECT TOP 5 *
      FROM cyrg2025.dbo.Orders
    `);
    
    if (dataResult.recordset.length > 0) {
      console.log('前5条数据:');
      dataResult.recordset.forEach((row, index) => {
        console.log(`\n记录 ${index + 1}:`);
        Object.keys(row).forEach(key => {
          console.log(`  ${key}: ${row[key]}`);
        });
      });
    } else {
      console.log('表中没有数据');
    }
    
    console.log('\n=== 检查完成 ===');
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('数据库连接已关闭');
    }
  }
}

checkcyrg2025Schema(); 