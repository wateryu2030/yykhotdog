const CustomerProfileService = require('./src/services/CustomerProfileService.ts').default;
const sql = require('mssql');

async function testSingleRecord() {
  try {
    console.log('🔍 测试单条记录同步...');
    
    const service = new CustomerProfileService();
    console.log('✅ CustomerProfileService实例化成功');
    
    // 连接数据库
    const cyrg2025Pool = await sql.connect(service.cyrg2025Config);
    const hotdogPool = await sql.connect(service.hotdogConfig);
    console.log('✅ 数据库连接成功');
    
    // 查询单条客户记录
    const customerQuery = `
      SELECT TOP 1
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
    `;

    const result = await cyrg2025Pool.request().query(customerQuery);
    console.log(`✅ 查询到 ${result.recordset.length} 个客户记录`);
    
    if (result.recordset.length > 0) {
      const record = result.recordset[0];
      console.log('客户ID:', record.customer_id);
      
      const customerProfile = {
        customer_id: record.customer_id,
        open_id: record.open_id,
        vip_num: record.vip_num,
        phone: record.phone,
        nickname: record.nickname,
        gender: record.gender,
        city: record.city,
        district: record.district,
        first_order_date: record.first_order_date,
        last_order_date: record.last_order_date,
        total_orders: record.total_orders,
        total_spend: record.total_spend || 0,
        avg_order_amount: record.avg_order_amount || 0,
        order_frequency: 1.5,
        customer_lifetime_value: record.total_spend || 0,
        age_group: '26-35',
        rfm_score: '555',
        customer_segment: '重要价值客户'
      };

      console.log('🔍 开始同步单条记录...');
      await service.upsertCustomerProfile(hotdogPool, customerProfile);
      console.log('✅ 单条记录同步成功');
      
      // 验证同步结果
      const verifyResult = await hotdogPool.request()
        .input('customer_id', sql.NVarChar, record.customer_id)
        .query('SELECT * FROM customer_profiles WHERE customer_id = @customer_id');
      console.log(`✅ 验证同步成功，找到 ${verifyResult.recordset.length} 条记录`);
    }
    
    await cyrg2025Pool.close();
    await hotdogPool.close();
    console.log('✅ 测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testSingleRecord(); 