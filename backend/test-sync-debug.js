const sql = require('mssql');

const cyrg2025Config = {
  server: process.env.cyrg2025_DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.cyrg2025_DB_PORT || '1433'),
  user: process.env.cyrg2025_DB_USER || 'hotdog',
  password: process.env.cyrg2025_DB_PASSWORD || 'Zhkj@62102218',
  database: process.env.cyrg2025_DB_NAME || 'cyrg2025',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const hotdogConfig = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.DB_PORT || '1433'),
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  database: process.env.DB_NAME || 'hotdog2030',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function testSync() {
  try {
    console.log('开始测试同步...');
    
    // 连接cyrg2025数据库
    console.log('连接cyrg2025数据库...');
    const cyrg2025Pool = await sql.connect(cyrg2025Config);
    console.log('cyrg2025数据库连接成功');
    
    // 连接hotdog2030数据库
    console.log('连接hotdog2030数据库...');
    const hotdogPool = await sql.connect(hotdogConfig);
    console.log('hotdog2030数据库连接成功');
    
    // 显式切换到hotdog2030数据库
    await hotdogPool.request().query('USE hotdog2030');
    console.log('切换到hotdog2030数据库');
    
    // 检查customer_profiles表是否存在
    console.log('检查customer_profiles表...');
    const tableCheck = await hotdogPool.request().query(`
      SELECT COUNT(*) as table_count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'customer_profiles'
    `);
    console.log('customer_profiles表存在:', tableCheck.recordset[0].table_count > 0);
    
    // 获取客户数据总数
    console.log('获取cyrg2025数据库中的客户数据...');
    const countResult = await cyrg2025Pool.request().query(`
      SELECT COUNT(DISTINCT o.openId) as total_customers
      FROM cyrg2025.dbo.Orders o
      WHERE (o.payState = 2 OR o.payState IS NULL)
        AND (o.delflag = 0 OR o.delflag IS NULL)
        AND o.recordTime IS NOT NULL
    `);
    console.log('总客户数:', countResult.recordset[0].total_customers);
    
    // 获取一小批数据进行测试
    console.log('获取测试数据...');
    const testResult = await cyrg2025Pool.request().query(`
      SELECT DISTINCT
        COALESCE(o.openId, CONCAT('CUST_', o.id)) as customer_id,
        o.openId as open_id,
        CAST(o.vipId AS VARCHAR(50)) as vip_num,
        o.vipTel as phone,
        NULL as nickname,
        NULL as gender,
        NULL as city,
        NULL as district,
        MIN(CAST(o.recordTime AS DATE)) as first_order_date,
        MAX(CAST(o.recordTime AS DATE)) as last_order_date,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(CASE WHEN o.cash > 0 THEN o.cash ELSE o.total END) as total_spend,
        AVG(CASE WHEN o.cash > 0 THEN o.cash ELSE o.total END) as avg_order_amount
      FROM cyrg2025.dbo.Orders o
      WHERE (o.payState = 2 OR o.payState IS NULL)
        AND (o.delflag = 0 OR o.delflag IS NULL)
        AND o.recordTime IS NOT NULL
      GROUP BY o.openId, o.vipId, o.id, o.vipTel
      ORDER BY o.openId
      OFFSET 0 ROWS
      FETCH NEXT 5 ROWS ONLY
    `);
    console.log('测试数据数量:', testResult.recordset.length);
    console.log('第一条测试数据:', testResult.recordset[0]);
    
    // 测试插入一条数据
    if (testResult.recordset.length > 0) {
      console.log('测试插入一条数据...');
      const record = testResult.recordset[0];
      const batchTime = new Date().toISOString();
      
      const mergeSQL = `
        MERGE customer_profiles AS target
        USING (SELECT 
          '${record.customer_id}' as customer_id,
          ${record.open_id ? `'${record.open_id}'` : 'NULL'} as open_id,
          ${record.vip_num ? `'${record.vip_num}'` : 'NULL'} as vip_num,
          ${record.phone ? `'${record.phone}'` : 'NULL'} as phone,
          ${record.nickname ? `'${record.nickname}'` : 'NULL'} as nickname,
          ${record.gender || 'NULL'} as gender,
          ${record.city ? `'${record.city}'` : 'NULL'} as city,
          ${record.district ? `'${record.district}'` : 'NULL'} as district,
          ${record.first_order_date ? `'${record.first_order_date.toISOString()}'` : 'NULL'} as first_order_date,
          ${record.last_order_date ? `'${record.last_order_date.toISOString()}'` : 'NULL'} as last_order_date,
          ${record.total_orders} as total_orders,
          ${record.total_spend || 0} as total_spend,
          ${record.avg_order_amount || 0} as avg_order_amount,
          0 as order_frequency,
          ${record.total_spend || 0} as customer_lifetime_value,
          '111' as rfm_score,
          '低价值客户' as customer_segment,
          '${batchTime}' as batch_time
        ) AS source
        ON target.customer_id = source.customer_id
        WHEN MATCHED THEN
          UPDATE SET
            open_id = source.open_id,
            vip_num = source.vip_num,
            phone = source.phone,
            nickname = source.nickname,
            gender = source.gender,
            city = source.city,
            district = source.district,
            first_order_date = source.first_order_date,
            last_order_date = source.last_order_date,
            total_orders = source.total_orders,
            total_spend = source.total_spend,
            avg_order_amount = source.avg_order_amount,
            order_frequency = source.order_frequency,
            customer_lifetime_value = source.customer_lifetime_value,
            rfm_score = source.rfm_score,
            customer_segment = source.customer_segment,
            batch_time = source.batch_time,
            updated_at = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (
            customer_id, open_id, vip_num, phone, nickname, gender, city, district,
            first_order_date, last_order_date, total_orders, total_spend, avg_order_amount,
            order_frequency, customer_lifetime_value, rfm_score, customer_segment, batch_time
          )
          VALUES (
            source.customer_id, source.open_id, source.vip_num, source.phone, source.nickname,
            source.gender, source.city, source.district, source.first_order_date, source.last_order_date,
            source.total_orders, source.total_spend, source.avg_order_amount, source.order_frequency,
            source.customer_lifetime_value, source.rfm_score, source.customer_segment, source.batch_time
          );
      `;
      
      await hotdogPool.request().query(mergeSQL);
      console.log('测试数据插入成功');
      
      // 验证插入结果
      const verifyResult = await hotdogPool.request().query(`
        SELECT COUNT(*) as count FROM customer_profiles WHERE customer_id = '${record.customer_id}'
      `);
      console.log('验证结果:', verifyResult.recordset[0].count, '条记录');
    }
    
    await cyrg2025Pool.close();
    await hotdogPool.close();
    console.log('测试完成');
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testSync(); 