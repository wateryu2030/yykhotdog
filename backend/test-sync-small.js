const CustomerProfileService = require('./src/services/CustomerProfileService.ts').default;

async function testSmallSync() {
  try {
    console.log('🔍 测试少量数据同步...');
    
    const service = new CustomerProfileService();
    console.log('✅ CustomerProfileService实例化成功');
    
    // 只同步前10条记录进行测试
    console.log('🔍 开始同步少量客户数据...');
    
    const sql = require('mssql');
    const cyrg2025Pool = await sql.connect(service.cyrg2025Config);
    const hotdogPool = await sql.connect(service.hotdogConfig);

    // 查询少量客户基础数据
    const customerQuery = `
      SELECT TOP 10
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

    // 批量插入或更新客户画像数据
    for (const record of result.recordset) {
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
        order_frequency: 1.5, // 简化计算
        customer_lifetime_value: record.total_spend || 0,
        age_group: '26-35',
        rfm_score: '555',
        customer_segment: '重要价值客户'
      };

      await service.upsertCustomerProfile(hotdogPool, customerProfile);
      console.log(`✅ 同步客户: ${record.customer_id}`);
    }

    await cyrg2025Pool.close();
    await hotdogPool.close();
    
    console.log('✅ 少量数据同步完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testSmallSync(); 