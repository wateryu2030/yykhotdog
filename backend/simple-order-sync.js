const sql = require('mssql');
require('dotenv').config();

// 数据库配置
const sourceConfig = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'cyrg2025',
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    pool: {
      max: 20,
      min: 5,
      idleTimeoutMillis: 30000
    },
    requestTimeout: 300000,
    enableArithAbort: true
  }
};

const targetConfig = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'hotdog2030',
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    pool: {
      max: 20,
      min: 5,
      idleTimeoutMillis: 30000
    },
    requestTimeout: 300000,
    enableArithAbort: true
  }
};

// 客户分群函数
function getCustomerSegment(totalOrders, totalSpend) {
  if (totalOrders >= 10 || totalSpend >= 500) return 'VIP客户';
  if (totalOrders >= 5 || totalSpend >= 200) return '高频客户';
  if (totalOrders >= 2 || totalSpend >= 100) return '活跃客户';
  return '新客户';
}

// 批量插入客户数据
async function batchInsertCustomers(targetPool, customers) {
  if (customers.length === 0) return;
  
  const values = customers.map(customer => {
    const customerSegment = getCustomerSegment(customer.total_orders, customer.total_spend);
    
    // 安全处理日期格式
    let firstOrderDate = 'NULL';
    if (customer.first_order_date) {
      try {
        const date = new Date(customer.first_order_date);
        if (!isNaN(date.getTime())) {
          firstOrderDate = `'${date.toISOString().split('T')[0]}'`;
        }
      } catch (e) {
        // 如果日期转换失败，保持NULL
      }
    }
    
    let lastOrderDate = 'NULL';
    if (customer.last_order_date) {
      try {
        const date = new Date(customer.last_order_date);
        if (!isNaN(date.getTime())) {
          lastOrderDate = `'${date.toISOString().split('T')[0]}'`;
        }
      } catch (e) {
        // 如果日期转换失败，保持NULL
      }
    }
    
    return `(
      '${customer.customer_id?.replace(/'/g, "''") || ''}',
      '${customer.open_id?.replace(/'/g, "''") || ''}',
      '${customer.vip_num?.replace(/'/g, "''") || ''}',
      '${customer.phone?.replace(/'/g, "''") || ''}',
      '${customer.nickname?.replace(/'/g, "''") || ''}',
      '${customer.gender?.replace(/'/g, "''") || ''}',
      '${customer.city?.replace(/'/g, "''") || ''}',
      '${customer.district?.replace(/'/g, "''") || ''}',
      ${firstOrderDate},
      ${lastOrderDate},
      ${customer.total_orders || 0},
      ${customer.total_spend || 0},
      ${customer.avg_order_amount || 0},
      '${customerSegment}',
      GETDATE(),
      GETDATE()
    )`;
  }).join(',');
  
  const insertQuery = `
    INSERT INTO hotdog2030.dbo.customer_profiles (
      customer_id, open_id, vip_num, phone, nickname, gender, city, district,
      first_order_date, last_order_date, total_orders, total_spend, avg_order_amount,
      customer_segment, created_at, updated_at
    ) VALUES ${values}
  `;
  
  await targetPool.request().query(insertQuery);
}

// 批量插入订单数据
async function batchInsertOrders(targetPool, orders) {
  if (orders.length === 0) return;
  
  const values = orders.map(order => {
    // 安全处理日期格式
    let orderDate = 'NULL';
    if (order.order_date) {
      try {
        const date = new Date(order.order_date);
        if (!isNaN(date.getTime())) {
          orderDate = `'${date.toISOString()}'`;
        }
      } catch (e) {
        // 如果日期转换失败，保持NULL
      }
    }
    
    return `(
      '${order.customer_id?.replace(/'/g, "''") || ''}',
      ${order.order_id || 0},
      '${order.order_no?.replace(/'/g, "''") || ''}',
      ${orderDate},
      ${order.total_amount || 0},
      ${order.pay_state || 0},
      ${order.shop_id || 0},
      GETDATE()
    )`;
  }).join(',');
  
  const insertQuery = `
    INSERT INTO hotdog2030.dbo.customer_orders (
      customer_id, order_id, order_no, order_date, total_amount, pay_state, shop_id, created_at
    ) VALUES ${values}
  `;
  
  await targetPool.request().query(insertQuery);
}

async function simpleOrderSync() {
  let sourcePool, targetPool;
  
  try {
    console.log('🚀 开始简单订单同步...');
    const startTime = Date.now();
    
    // 连接数据库
    console.log('📡 连接数据库...');
    sourcePool = await sql.connect(sourceConfig);
    targetPool = await sql.connect(targetConfig);
    console.log('✅ 数据库连接成功');
    
    // 确保使用正确的数据库上下文
    await sourcePool.request().query('USE cyrg2025');
    await targetPool.request().query('USE hotdog2030');
    console.log('✅ 数据库上下文设置完成');
    
    // 1. 获取源数据统计 - 严格按照用户提供的SQL查询口径
    console.log('\n📊 获取源数据统计...');
    const orderCountResult = await sourcePool.request().query(`
      SELECT 
        COUNT(*) AS 订单数,
        SUM(vipAmount + vipAmountZengSong + cash + total) AS 总销售额,
        CONVERT(DECIMAL(10,2), round(SUM(vipAmount + vipAmountZengSong + cash + total) / CASE WHEN COUNT(*) = 0 THEN 1 ELSE COUNT(*) END, 2)) AS 客单价
      FROM cyrg2025.dbo.Orders 
      WHERE delflag = 0 
        AND payState IN (1, 2, 3)
    `);
    
    const stats = orderCountResult.recordset[0];
    
    console.log(`📈 源数据统计 (严格按照查询口径):`);
    console.log(`   - 总订单数: ${stats.订单数.toLocaleString()}`);
    console.log(`   - 总销售额: ¥${stats.总销售额.toLocaleString()}`);
    console.log(`   - 客单价: ¥${stats.客单价.toLocaleString()}`);
    
    if (stats.订单数 === 0) {
      console.log('❌ 没有找到符合条件的订单数据');
      return;
    }
    
    // 2. 清空目标表
    console.log('\n🧹 清空目标表...');
    await targetPool.request().query('DELETE FROM hotdog2030.dbo.customer_profiles');
    await targetPool.request().query('DELETE FROM hotdog2030.dbo.customer_orders');
    console.log('✅ 目标表已清空');
    
    // 3. 同步客户数据 - 基于订单数据生成客户画像
    console.log('\n👥 开始同步客户数据...');
    const customerStartTime = Date.now();
    const customerBatchSize = 800; // 避免SQL Server的1000行限制
    let customerOffset = 0;
    let customerCount = 0;
    
    while (true) {
      const batchStartTime = Date.now();
      
      const customerBatchResult = await sourcePool.request().query(`
        SELECT 
          openId as customer_id,
          openId as open_id,
          CAST(vipId AS VARCHAR(50)) as vip_num,
          vipTel as phone,
          NULL as nickname,
          NULL as gender,
          MAX(shopName) as city,
          NULL as district,
          MIN(recordTime) as first_order_date,
          MAX(recordTime) as last_order_date,
          COUNT(*) as total_orders,
          SUM(vipAmount + vipAmountZengSong + cash + total) as total_spend,
          AVG(vipAmount + vipAmountZengSong + cash + total) as avg_order_amount
        FROM cyrg2025.dbo.Orders
        WHERE delflag = 0 
          AND payState IN (1, 2, 3)
          AND openId IS NOT NULL
          AND openId != ''
        GROUP BY openId, vipId, vipTel
        ORDER BY total_orders DESC
        OFFSET ${customerOffset} ROWS
        FETCH NEXT ${customerBatchSize} ROWS ONLY
      `);
      
      if (customerBatchResult.recordset.length === 0) break;
      
      // 批量插入客户数据
      await batchInsertCustomers(targetPool, customerBatchResult.recordset);
      
      customerCount += customerBatchResult.recordset.length;
      customerOffset += customerBatchSize;
      const batchTime = Date.now() - batchStartTime;
      console.log(`✅ 已同步 ${customerCount} 个客户 - 本批次: ${customerBatchResult.recordset.length} 个 - 耗时: ${batchTime}ms`);
    }
    
    console.log(`✅ 客户同步完成，共同步 ${customerCount} 个客户`);
    const customerTotalTime = Date.now() - customerStartTime;
    console.log(`✅ 客户同步耗时: ${Math.floor(customerTotalTime / 1000)}秒`);
    
    // 4. 同步订单数据 - 严格按照用户提供的条件
    console.log('\n📦 开始同步订单数据...');
    const orderStartTime = Date.now();
    const orderBatchSize = 800; // 避免SQL Server的1000行限制
    let orderOffset = 0;
    let orderCount = 0;
    
    while (orderCount < stats.订单数) {
      const batchStartTime = Date.now();
      
      const orderBatchResult = await sourcePool.request().query(`
        SELECT 
          id as order_id,
          orderNo as order_no,
          openId as customer_id,
          recordTime as order_date,
          (vipAmount + vipAmountZengSong + cash + total) as total_amount,
          payState as pay_state,
          shopId as shop_id
        FROM cyrg2025.dbo.Orders
        WHERE delflag = 0 
          AND payState IN (1, 2, 3)
        ORDER BY recordTime DESC
        OFFSET ${orderOffset} ROWS
        FETCH NEXT ${orderBatchSize} ROWS ONLY
      `);
      
      if (orderBatchResult.recordset.length === 0) break;
      
      // 批量插入订单数据
      await batchInsertOrders(targetPool, orderBatchResult.recordset);
      
      orderCount += orderBatchResult.recordset.length;
      orderOffset += orderBatchSize;
      const batchTime = Date.now() - batchStartTime;
      const progress = ((orderCount / stats.订单数) * 100).toFixed(1);
      console.log(`✅ 已同步 ${orderCount} 个订单 (${progress}%) - 本批次: ${orderBatchResult.recordset.length} 个 - 耗时: ${batchTime}ms`);
      
      if (orderCount >= stats.订单数) break;
    }
    
    const orderTotalTime = Date.now() - orderStartTime;
    console.log(`✅ 订单同步完成，共同步 ${orderCount} 个订单，总耗时: ${Math.floor(orderTotalTime / 1000)}秒`);
    
    // 5. 验证同步结果
    console.log('\n🔍 验证同步结果...');
    const verifyResult = await targetPool.request().query(`
      SELECT 
        COUNT(*) as synced_customers,
        (SELECT COUNT(*) FROM hotdog2030.dbo.customer_orders) as synced_orders,
        SUM(total_spend) as total_synced_amount
      FROM hotdog2030.dbo.customer_profiles
    `);
    
    const verify = verifyResult.recordset[0];
    console.log(`📊 同步结果验证:`);
    console.log(`   - 同步客户数: ${verify.synced_customers.toLocaleString()}`);
    console.log(`   - 同步订单数: ${verify.synced_orders.toLocaleString()}`);
    console.log(`   - 同步总金额: ¥${verify.total_synced_amount.toLocaleString()}`);
    
    const totalTime = Date.now() - startTime;
    console.log(`\n🎉 简单订单同步完成！`);
    console.log(`   - 总耗时: ${Math.floor(totalTime / 1000)}秒`);
    console.log(`   - 客户同步: ${Math.floor(customerTotalTime / 1000)}秒`);
    console.log(`   - 订单同步: ${Math.floor(orderTotalTime / 1000)}秒`);
    console.log(`   - 平均速度: ${Math.floor(orderCount / (totalTime / 1000))} 订单/秒`);
    
  } catch (error) {
    console.error('❌ 同步失败:', error.message);
    throw error;
  } finally {
    if (sourcePool) await sourcePool.close();
    if (targetPool) await targetPool.close();
  }
}

// 运行简单订单同步
simpleOrderSync().catch(console.error); 