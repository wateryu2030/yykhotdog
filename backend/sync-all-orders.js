const sql = require('mssql');
require('dotenv').config();

const sourceConfig = {
  server: process.env.cyrg2025_DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.cyrg2025_DB_PORT || '1433'),
  database: process.env.cyrg2025_DB_NAME || 'cyrg2025',
  user: process.env.cyrg2025_DB_USER || 'hotdog',
  password: process.env.cyrg2025_DB_PASSWORD || 'Zhkj@62102218',
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

async function syncAllOrders() {
  let sourcePool, targetPool;
  
  try {
    console.log('开始同步所有订单数据...');
    
    // 连接源数据库
    console.log('连接源数据库...');
    sourcePool = await sql.connect(sourceConfig);
    console.log('源数据库连接成功');
    
    // 连接目标数据库
    console.log('连接目标数据库...');
    targetPool = await sql.connect(targetConfig);
    console.log('目标数据库连接成功');

    // 强制切换到 hotdog2030 数据库
    await targetPool.request().query('USE hotdog2030');
    
    // 1. 获取所有有效订单
    console.log('\n=== 获取所有有效订单 ===');
    const ordersResult = await sourcePool.request().query(`
      SELECT 
        o.id as order_id,
        o.orderNo as order_no,
        o.recordId as customer_id,
        o.total as total_amount,
        o.payState as pay_state,
        o.shopId as shop_id,
        o.recordTime as order_date
      FROM cyrg2025.dbo.[Orders] o
      WHERE o.recordId IS NOT NULL AND o.delflag = 0 AND TRY_CONVERT(datetime, o.recordTime) IS NOT NULL
      ORDER BY o.recordTime
    `);
    
    console.log(`找到 ${ordersResult.recordset.length} 个有效订单`);
    
    // 2. 清空现有订单数据
    console.log('\n=== 清空现有订单数据 ===');
    await targetPool.request().query('DELETE FROM customer_orders');
    console.log('已清空现有订单数据');
    
    // 3. 分批插入订单数据
    console.log('\n=== 开始插入订单数据 ===');
    const batchSize = 1000;
    let insertedCount = 0;
    
    for (let i = 0; i < ordersResult.recordset.length; i += batchSize) {
      const batch = ordersResult.recordset.slice(i, i + batchSize);
      const values = batch.map(order => 
        `('${order.customer_id}', ${order.order_id}, '${order.order_no || ''}', '${order.order_date || null}', ${order.total_amount || 0}, ${order.pay_state || 0}, ${order.shop_id || 0}, GETDATE())`
      ).join(',');
      
      await targetPool.request().query(`
        INSERT INTO customer_orders 
        (customer_id, order_id, order_no, order_date, total_amount, pay_state, shop_id, created_at)
        VALUES ${values}
      `);
      
      insertedCount += batch.length;
      console.log(`已插入 ${insertedCount}/${ordersResult.recordset.length} 个订单 (${Math.round(insertedCount/ordersResult.recordset.length*100)}%)`);
      
      // 每插入1000个订单暂停一下，避免数据库压力过大
      if (insertedCount % 5000 === 0) {
        console.log('暂停2秒...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // 2. 获取所有有效客户
    console.log('\n=== 获取所有有效客户 ===');
    const customersResult = await sourcePool.request().query(`
      SELECT 
        u.ID as customer_id,
        u.Tel as phone,
        u.RecordTime as first_order_date,
        u.RecordTime as last_order_date
      FROM cyrg2025.dbo.[User] u
      WHERE u.ID IS NOT NULL
    `);
    
    console.log(`找到 ${customersResult.recordset.length} 个有效客户`);
    
    // 5. 清空现有客户数据
    console.log('\n=== 清空现有客户数据 ===');
    await targetPool.request().query('DELETE FROM customer_profiles');
    console.log('已清空现有客户数据');
    
    // 6. 插入客户数据
    console.log('\n=== 插入客户数据 ===');
    function formatDateForMSSQL(date) {
      if (!date) return null;
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      // yyyy-MM-dd HH:mm:ss
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
    }
    for (let i = 0; i < customersResult.recordset.length; i += 1000) {
      const batch = customersResult.recordset.slice(i, i + 1000)
        .filter(customer => customer.phone && customer.first_order_date && customer.last_order_date);
      const values = batch.map(customer => {
        const f = formatDateForMSSQL(customer.first_order_date);
        const l = formatDateForMSSQL(customer.last_order_date);
        return `('${customer.customer_id}', '${customer.phone}', ${f ? `'${f}'` : 'NULL'}, ${l ? `'${l}'` : 'NULL'}, GETDATE(), GETDATE())`;
      }).join(',');
      if (values.length === 0) continue;
      await targetPool.request().query(`
        INSERT INTO customer_profiles 
        (customer_id, phone, first_order_date, last_order_date, created_at, updated_at)
        VALUES ${values}
      `);
      console.log(`已插入 ${Math.min(i + 1000, customersResult.recordset.length)}/${customersResult.recordset.length} 个客户`);
    }
    
    // 7. 更新客户统计信息
    console.log('\n=== 更新客户统计信息 ===');
    await targetPool.request().query(`
      UPDATE cp
      SET 
        total_orders = co_stats.order_count,
        total_spend = co_stats.total_spend
      FROM customer_profiles cp
      JOIN (
        SELECT customer_id, COUNT(*) as order_count, SUM(total_amount) as total_spend
        FROM customer_orders
        GROUP BY customer_id
      ) co_stats ON cp.customer_id = co_stats.customer_id
    `);
    console.log('客户统计信息已更新');
    
    // 8. 检查最终结果
    console.log('\n=== 同步结果检查 ===');
    const finalStats = await targetPool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM customer_profiles) as total_customers,
        (SELECT COUNT(*) FROM customer_orders) as total_orders,
        (SELECT SUM(total_spend) FROM customer_profiles) as total_spend
    `);
    
    const stats = finalStats.recordset[0];
    console.log(`\n🎉 同步完成！`);
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

syncAllOrders(); 