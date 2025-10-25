const sql = require('mssql');
require('dotenv').config();

// 超高性能配置
const sourceConfig = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'cyrg2025',
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    // 超高性能连接池配置
    pool: {
      max: 50, // 大幅增加连接数
      min: 10,
      idleTimeoutMillis: 60000,
      acquireTimeoutMillis: 60000
    },
    // 超时配置
    requestTimeout: 600000, // 10分钟超时
    cancelTimeout: 10000,
    // 性能优化
    enableArithAbort: true,
    packetSize: 32768, // 增大数据包大小
    useUTC: false
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
    // 超高性能连接池配置
    pool: {
      max: 50, // 大幅增加连接数
      min: 10,
      idleTimeoutMillis: 60000,
      acquireTimeoutMillis: 60000
    },
    // 超时配置
    requestTimeout: 600000, // 10分钟超时
    cancelTimeout: 10000,
    // 性能优化
    enableArithAbort: true,
    packetSize: 32768, // 增大数据包大小
    useUTC: false
  }
};

// 客户分群函数
function getCustomerSegment(totalOrders, totalSpend) {
  if (totalOrders >= 10 || totalSpend >= 500) return 'VIP客户';
  if (totalOrders >= 5 || totalSpend >= 200) return '高频客户';
  if (totalOrders >= 2 || totalSpend >= 100) return '活跃客户';
  return '新客户';
}

// 超高性能批量插入客户数据
async function ultraBatchInsertCustomers(targetPool, customers) {
  if (customers.length === 0) return;
  
  const table = new sql.Table('hotdog2030.dbo.customer_profiles');
  table.columns.add('customer_id', sql.VarChar(255), { nullable: false });
  table.columns.add('open_id', sql.VarChar(255), { nullable: true });
  table.columns.add('vip_num', sql.VarChar(50), { nullable: true });
  table.columns.add('phone', sql.VarChar(50), { nullable: true });
  table.columns.add('nickname', sql.VarChar(255), { nullable: true });
  table.columns.add('gender', sql.VarChar(10), { nullable: true });
  table.columns.add('city', sql.VarChar(100), { nullable: true });
  table.columns.add('district', sql.VarChar(100), { nullable: true });
  table.columns.add('first_order_date', sql.Date, { nullable: true });
  table.columns.add('last_order_date', sql.Date, { nullable: true });
  table.columns.add('total_orders', sql.Int, { nullable: true });
  table.columns.add('total_spend', sql.Decimal(10, 2), { nullable: true });
  table.columns.add('avg_order_amount', sql.Decimal(10, 2), { nullable: true });
  table.columns.add('customer_segment', sql.VarChar(50), { nullable: true });
  table.columns.add('created_at', sql.DateTime, { nullable: false });
  table.columns.add('updated_at', sql.DateTime, { nullable: false });
  
  // 批量添加数据
  for (const customer of customers) {
    const customerSegment = getCustomerSegment(customer.total_orders, customer.total_spend);
    table.rows.add(
      customer.customer_id,
      customer.open_id,
      customer.vip_num,
      customer.phone,
      customer.nickname,
      customer.gender,
      customer.city,
      customer.district,
      customer.first_order_date,
      customer.last_order_date,
      customer.total_orders,
      customer.total_spend,
      customer.avg_order_amount,
      customerSegment,
      new Date(),
      new Date()
    );
  }
  
  await targetPool.request().bulk(table);
}

// 超高性能批量插入订单数据
async function ultraBatchInsertOrders(targetPool, orders) {
  if (orders.length === 0) return;
  
  const table = new sql.Table('hotdog2030.dbo.customer_orders');
  table.columns.add('customer_id', sql.VarChar(255), { nullable: false });
  table.columns.add('order_id', sql.Int, { nullable: false });
  table.columns.add('order_no', sql.VarChar(255), { nullable: true });
  table.columns.add('order_date', sql.DateTime, { nullable: true });
  table.columns.add('total_amount', sql.Decimal(10, 2), { nullable: true });
  table.columns.add('pay_state', sql.Int, { nullable: true });
  table.columns.add('shop_id', sql.Int, { nullable: true });
  table.columns.add('created_at', sql.DateTime, { nullable: false });
  
  // 批量添加数据
  for (const order of orders) {
    table.rows.add(
      order.customer_id,
      order.order_id,
      order.order_no,
      order.order_date,
      order.total_amount,
      order.pay_state,
      order.shop_id,
      new Date()
    );
  }
  
  await targetPool.request().bulk(table);
}

// 并行处理函数
async function parallelProcess(concurrency, tasks) {
  const results = [];
  const chunks = [];
  
  // 将任务分块
  for (let i = 0; i < tasks.length; i += concurrency) {
    chunks.push(tasks.slice(i, i + concurrency));
  }
  
  // 并行执行每个块
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(chunk.map(task => task()));
    results.push(...chunkResults);
  }
  
  return results;
}

async function ultraFastSync() {
  let sourcePool, targetPool;
  
  try {
    console.log('🚀 开始超高性能数据同步...');
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
        COUNT(*) as total_orders,
        SUM(vipAmount + vipAmountZengSong + cash + total) as total_amount,
        CONVERT(DECIMAL(10,2), round(SUM(vipAmount + vipAmountZengSong + cash + total) / CASE WHEN COUNT(*) = 0 THEN 1 ELSE COUNT(*) END, 2)) as avg_order_amount
      FROM cyrg2025.dbo.Orders 
      WHERE delflag = 0 
        AND payState IN (1, 2, 3)
    `);
    
    const userCountResult = await sourcePool.request().query(`
      SELECT COUNT(*) as total_users 
      FROM (
        SELECT DISTINCT openId AS 用户名称 
        FROM cyrg2025.dbo.Orders 
        WHERE delflag = 0 
          AND payState IN (1, 2, 3) 
          AND openId != ''
      ) a
    `);
    
    const stats = orderCountResult.recordset[0];
    const userStats = userCountResult.recordset[0];
    
    console.log(`📈 源数据统计 (严格按照查询口径):`);
    console.log(`   - 总订单数: ${stats.total_orders.toLocaleString()}`);
    console.log(`   - 总用户数: ${userStats.total_users.toLocaleString()}`);
    console.log(`   - 总销售额: ¥${stats.total_amount.toLocaleString()}`);
    console.log(`   - 客单价: ¥${stats.avg_order_amount.toLocaleString()}`);
    
    if (stats.total_orders === 0) {
      console.log('❌ 没有找到符合条件的订单数据');
      return;
    }
    
    // 2. 清空目标表
    console.log('\n🧹 清空目标表...');
    await targetPool.request().query('DELETE FROM hotdog2030.dbo.customer_profiles');
    await targetPool.request().query('DELETE FROM hotdog2030.dbo.customer_orders');
    console.log('✅ 目标表已清空');
    
    // 3. 超高性能同步客户数据
    console.log('\n👥 开始超高性能同步客户数据...');
    const customerBatchSize = 20000; // 超大批次
    let customerOffset = 0;
    let customerCount = 0;
    const customerStartTime = Date.now();
    
    while (customerCount < userStats.total_users) {
      const batchStartTime = Date.now();
      
      const customerBatchResult = await sourcePool.request().query(`
        SELECT DISTINCT
          o.openId as customer_id,
          o.openId as open_id,
          CAST(o.vipId AS VARCHAR(50)) as vip_num,
          o.vipTel as phone,
          NULL as nickname,
          NULL as gender,
          o.shopName as city,
          NULL as district,
          MIN(o.recordTime) as first_order_date,
          MAX(o.recordTime) as last_order_date,
          COUNT(*) as total_orders,
          SUM(o.vipAmount + o.vipAmountZengSong + o.cash + o.total) as total_spend,
          AVG(o.vipAmount + o.vipAmountZengSong + o.cash + o.total) as avg_order_amount
        FROM cyrg2025.dbo.Orders o
        WHERE o.delflag = 0 
          AND o.payState IN (1, 2, 3)
          AND o.openId IS NOT NULL 
          AND o.openId != ''
        GROUP BY o.openId, o.vipId, o.vipTel, o.shopName
        ORDER BY total_orders DESC
        OFFSET ${customerOffset} ROWS
        FETCH NEXT ${customerBatchSize} ROWS ONLY
      `);
      
      if (customerBatchResult.recordset.length === 0) break;
      
      // 批量插入客户数据
      await ultraBatchInsertCustomers(targetPool, customerBatchResult.recordset);
      
      customerCount += customerBatchResult.recordset.length;
      customerOffset += customerBatchSize;
      const batchTime = Date.now() - batchStartTime;
      const progress = ((customerCount / userStats.total_users) * 100).toFixed(1);
      console.log(`✅ 已同步 ${customerCount} 个客户 (${progress}%) - 本批次: ${customerBatchResult.recordset.length} 个 - 耗时: ${batchTime}ms`);
      
      if (customerCount >= userStats.total_users) break;
    }
    
    const customerTotalTime = Date.now() - customerStartTime;
    console.log(`✅ 客户同步完成，共同步 ${customerCount} 个客户，总耗时: ${Math.floor(customerTotalTime / 1000)}秒`);
    
    // 4. 超高性能同步订单数据 - 使用并行处理
    console.log('\n📦 开始超高性能同步订单数据...');
    const orderBatchSize = 50000; // 超大批次
    let orderOffset = 0;
    let orderCount = 0;
    const orderStartTime = Date.now();
    
    // 创建并行任务
    const orderTasks = [];
    const maxConcurrency = 5; // 并行度
    
    while (orderCount < stats.total_orders) {
      const currentOffset = orderOffset;
      const currentBatchSize = orderBatchSize;
      
      orderTasks.push(async () => {
        const batchStartTime = Date.now();
        
        const orderBatchResult = await sourcePool.request().query(`
          SELECT 
            o.id as order_id,
            o.orderNo as order_no,
            o.openId as customer_id,
            o.recordTime as order_date,
            (o.vipAmount + o.vipAmountZengSong + o.cash + o.total) as total_amount,
            o.payState as pay_state,
            o.shopId as shop_id
          FROM cyrg2025.dbo.Orders o
          WHERE o.delflag = 0 
            AND o.payState IN (1, 2, 3)
            AND o.openId IS NOT NULL 
            AND o.openId != ''
          ORDER BY o.recordTime DESC
          OFFSET ${currentOffset} ROWS
          FETCH NEXT ${currentBatchSize} ROWS ONLY
        `);
        
        if (orderBatchResult.recordset.length > 0) {
          await ultraBatchInsertOrders(targetPool, orderBatchResult.recordset);
        }
        
        const batchTime = Date.now() - batchStartTime;
        return {
          count: orderBatchResult.recordset.length,
          time: batchTime,
          offset: currentOffset
        };
      });
      
      orderCount += orderBatchSize;
      orderOffset += orderBatchSize;
      
      if (orderCount >= stats.total_orders) break;
    }
    
    // 并行执行订单同步任务
    console.log(`🔄 开始并行处理 ${orderTasks.length} 个订单批次...`);
    const orderResults = await parallelProcess(maxConcurrency, orderTasks);
    
    const totalOrdersSynced = orderResults.reduce((sum, result) => sum + result.count, 0);
    const orderTotalTime = Date.now() - orderStartTime;
    console.log(`✅ 订单同步完成，共同步 ${totalOrdersSynced} 个订单，总耗时: ${Math.floor(orderTotalTime / 1000)}秒`);
    
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
    console.log(`\n🎉 超高性能数据同步完成！`);
    console.log(`   - 总耗时: ${Math.floor(totalTime / 1000)}秒`);
    console.log(`   - 客户同步: ${Math.floor(customerTotalTime / 1000)}秒`);
    console.log(`   - 订单同步: ${Math.floor(orderTotalTime / 1000)}秒`);
    console.log(`   - 平均速度: ${Math.floor(totalOrdersSynced / (totalTime / 1000))} 订单/秒`);
    
  } catch (error) {
    console.error('❌ 同步失败:', error.message);
    throw error;
  } finally {
    if (sourcePool) await sourcePool.close();
    if (targetPool) await targetPool.close();
  }
}

// 运行超高性能同步
ultraFastSync().catch(console.error); 