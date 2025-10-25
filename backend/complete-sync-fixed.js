const sql = require('mssql');
require('dotenv').config();

const sourceConfig = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'cyrg2025', // 源数据库
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const targetConfig = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'hotdog2030', // 目标数据库
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function completeSync() {
  let sourcePool, targetPool;
  
  try {
    console.log('开始完整数据同步...');
    
    // 连接源数据库
    console.log('连接源数据库...');
    sourcePool = await sql.connect(sourceConfig);
    console.log('源数据库连接成功');
    
    // 连接目标数据库
    console.log('连接目标数据库...');
    targetPool = await sql.connect(targetConfig);
    console.log('目标数据库连接成功');
    
    // 验证目标数据库连接
    console.log('验证目标数据库表...');
    const tablesResult = await targetPool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = 'customer_profiles'
    `);
    console.log(`找到 ${tablesResult.recordset.length} 个customer_profiles表`);
    
    // 1. 同步客户数据
    console.log('\n=== 同步客户数据 ===');
    const customersResult = await sourcePool.request().query(`
      SELECT 
        u.ID as customer_id,
        u.x_openid as open_id,
        u.x_nickName as nickname,
        u.Tel as phone,
        u.Sex as gender,
        u.city,
        u.area as district,
        u.RecordTime as first_order_date,
        u.RecordTime as last_order_date
      FROM [User] u
      WHERE u.ID IS NOT NULL AND u.delflag = 0
    `);
    
    console.log(`找到 ${customersResult.recordset.length} 个客户`);
    
    // 清空现有客户数据
    await targetPool.request().query('DELETE FROM customer_profiles');
    console.log('已清空现有客户数据');
    
    // 插入客户数据
    for (let i = 0; i < customersResult.recordset.length; i += 1000) {
      const batch = customersResult.recordset.slice(i, i + 1000);
      const values = batch.map(customer => 
        `('${customer.customer_id}', '${customer.open_id || ''}', '', '${customer.phone || ''}', '${customer.nickname || ''}', '${customer.gender || ''}', '${customer.city || ''}', '${customer.district || ''}', '${customer.first_order_date || null}', '${customer.last_order_date || null}', 0, 0, 0, '新客户', GETDATE(), GETDATE())`
      ).join(',');
      
      await targetPool.request().query(`
        INSERT INTO customer_profiles 
        (customer_id, open_id, vip_num, phone, nickname, gender, city, district, first_order_date, last_order_date, total_orders, total_spend, avg_order_amount, customer_segment, created_at, updated_at)
        VALUES ${values}
      `);
      
      console.log(`已同步 ${Math.min(i + 1000, customersResult.recordset.length)} 个客户`);
    }
    
    // 2. 同步订单数据
    console.log('\n=== 同步订单数据 ===');
    const ordersResult = await sourcePool.request().query(`
      SELECT 
        o.id as order_id,
        o.orderNo as order_no,
        o.recordId as customer_id,
        o.total as total_amount,
        o.payState as pay_state,
        o.shopId as shop_id,
        o.recordTime as order_date
      FROM [Orders] o
      WHERE o.recordId IS NOT NULL AND o.delflag = 0
    `);
    
    console.log(`找到 ${ordersResult.recordset.length} 个订单`);
    
    // 清空现有订单数据
    await targetPool.request().query('DELETE FROM customer_orders');
    console.log('已清空现有订单数据');
    
    // 插入订单数据
    for (let i = 0; i < ordersResult.recordset.length; i += 1000) {
      const batch = ordersResult.recordset.slice(i, i + 1000);
      const values = batch.map(order => 
        `('${order.customer_id}', ${order.order_id}, '${order.order_no || ''}', '${order.order_date || null}', ${order.total_amount || 0}, ${order.pay_state || 0}, ${order.shop_id || 0}, GETDATE())`
      ).join(',');
      
      await targetPool.request().query(`
        INSERT INTO customer_orders 
        (customer_id, order_id, order_no, order_date, total_amount, pay_state, shop_id, created_at)
        VALUES ${values}
      `);
      
      console.log(`已同步 ${Math.min(i + 1000, ordersResult.recordset.length)} 个订单`);
    }
    
    // 3. 更新客户统计信息
    console.log('\n=== 更新客户统计信息 ===');
    await targetPool.request().query(`
      UPDATE cp
      SET 
        total_orders = co_stats.order_count,
        total_spend = co_stats.total_spend,
        avg_order_amount = CASE WHEN co_stats.order_count > 0 THEN co_stats.total_spend / co_stats.order_count ELSE 0 END,
        last_order_date = co_stats.last_order_date,
        customer_segment = CASE 
          WHEN co_stats.total_spend >= 1000 THEN 'VIP客户'
          WHEN co_stats.total_spend >= 500 THEN '高价值客户'
          WHEN co_stats.total_spend >= 200 THEN '中价值客户'
          WHEN co_stats.total_spend >= 50 THEN '低价值客户'
          ELSE '新客户'
        END,
        updated_at = GETDATE()
      FROM customer_profiles cp
      INNER JOIN (
        SELECT 
          customer_id,
          COUNT(*) as order_count,
          SUM(total_amount) as total_spend,
          MAX(order_date) as last_order_date
        FROM customer_orders
        GROUP BY customer_id
      ) co_stats ON cp.customer_id = co_stats.customer_id
    `);
    
    console.log('客户统计信息更新完成');
    
    // 4. 生成分析数据
    console.log('\n=== 生成分析数据 ===');
    
    // 清空现有分析数据
    await targetPool.request().query('DELETE FROM customer_segments');
    await targetPool.request().query('DELETE FROM customer_analysis');
    
    // 客户分群分析
    await targetPool.request().query(`
      INSERT INTO customer_segments (customer_segment, count, created_at)
      SELECT customer_segment, COUNT(*), GETDATE()
      FROM customer_profiles
      GROUP BY customer_segment
    `);
    
    // 订单数量分布
    await targetPool.request().query(`
      INSERT INTO customer_analysis (customer_id, analysis_type, analysis_data, created_at)
      SELECT 
        customer_id,
        'order_count_distribution',
        JSON_QUERY((
          SELECT 
            COUNT(*) as total_orders,
            SUM(total_amount) as total_spend,
            AVG(total_amount) as avg_order_amount
          FROM customer_orders co2 
          WHERE co2.customer_id = co1.customer_id
        ) FOR JSON PATH) as analysis_data,
        GETDATE()
      FROM customer_orders co1
      GROUP BY customer_id
    `);
    
    console.log('分析数据生成完成');
    
    // 5. 检查同步结果
    console.log('\n=== 同步结果检查 ===');
    const finalStats = await targetPool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM customer_profiles) as total_customers,
        (SELECT COUNT(*) FROM customer_orders) as total_orders,
        (SELECT SUM(total_spend) FROM customer_profiles) as total_spend
    `);
    
    const stats = finalStats.recordset[0];
    console.log(`同步完成！`);
    console.log(`- 客户总数: ${stats.total_customers}`);
    console.log(`- 订单总数: ${stats.total_orders}`);
    console.log(`- 总消费金额: ${stats.total_spend}`);
    
    await sourcePool.close();
    await targetPool.close();
    console.log('\n数据同步完成！');
    
  } catch (err) {
    console.error('同步过程中出错:', err);
    if (sourcePool) await sourcePool.close();
    if (targetPool) await targetPool.close();
  }
}

completeSync(); 