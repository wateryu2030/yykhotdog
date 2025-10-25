const sql = require('mssql');
require('dotenv').config();

const sourceConfig = {
  server: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  database: 'cyrg2025',
  user: process.env.DB_USERNAME || 'hotdog',
  password: process.env.DB_PASSWORD || 'Zhkj@62102218',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    // 优化连接池配置
    pool: {
      max: 20, // 增加连接数
      min: 5,
      idleTimeoutMillis: 30000
    },
    // 优化查询配置
    requestTimeout: 300000, // 5分钟超时
    cancelTimeout: 5000
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
    // 优化连接池配置
    pool: {
      max: 20, // 增加连接数
      min: 5,
      idleTimeoutMillis: 30000
    },
    // 优化查询配置
    requestTimeout: 300000, // 5分钟超时
    cancelTimeout: 5000
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
  
  const table = new sql.Table('hotdog2030.dbo.customer_profiles');
  // 严格对齐表结构顺序和类型
  table.columns.add('customer_id', sql.VarChar(100), { nullable: false });
  table.columns.add('open_id', sql.VarChar(100), { nullable: true });
  table.columns.add('vip_num', sql.VarChar(50), { nullable: true });
  table.columns.add('phone', sql.VarChar(20), { nullable: true });
  table.columns.add('nickname', sql.NVarChar(100), { nullable: true });
  table.columns.add('gender', sql.VarChar(10), { nullable: true });
  table.columns.add('city', sql.NVarChar(50), { nullable: true });
  table.columns.add('district', sql.NVarChar(50), { nullable: true });
  table.columns.add('first_order_date', sql.Date, { nullable: true });
  table.columns.add('last_order_date', sql.Date, { nullable: true });
  table.columns.add('total_orders', sql.Int, { nullable: true });
  table.columns.add('total_spend', sql.Decimal(18, 2), { nullable: true });
  table.columns.add('avg_order_amount', sql.Decimal(18, 2), { nullable: true });
  table.columns.add('customer_segment', sql.NVarChar(50), { nullable: true });
  table.columns.add('created_at', sql.DateTime, { nullable: true });
  table.columns.add('updated_at', sql.DateTime, { nullable: true });

  // 恢复全量批量插入逻辑
  for (const customer of customers) {
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
      customer.customer_segment,
      new Date(),
      new Date()
    );
  }
  await targetPool.request().bulk(table);
  console.log(`✅ 已同步 ${customers.length} 个客户`);
  return;
}

// 批量插入订单数据
async function batchInsertOrders(targetPool, orders) {
  if (orders.length === 0) return;
  
  const table = new sql.Table('hotdog2030.dbo.customer_orders');
  // customer_orders表结构严格对齐
  table.columns.add('customer_id', sql.VarChar(100), { nullable: false });
  table.columns.add('order_id', sql.Int, { nullable: false });
  table.columns.add('order_no', sql.VarChar(50), { nullable: true });
  table.columns.add('order_date', sql.DateTime, { nullable: true });
  table.columns.add('total_amount', sql.Decimal(18, 2), { nullable: true });
  table.columns.add('pay_state', sql.Int, { nullable: true });
  table.columns.add('shop_id', sql.Int, { nullable: true });
  table.columns.add('created_at', sql.DateTime, { nullable: true });

  // 恢复全量批量插入逻辑
  for (const order of orders) {
    const customerId = order.customer_id || 'ANONYMOUS';
    table.rows.add(
      customerId,
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
  console.log(`✅ 已同步 ${orders.length} 个订单`);
  return;
}

async function syncAllOrders() {
  let sourcePool, targetPool;
  
  try {
    console.log('🚀 开始超高性能同步所有订单数据...');
    const startTime = Date.now();
    
    // 连接源数据库
    console.log('📡 连接源数据库...');
    sourcePool = await sql.connect(sourceConfig);
    console.log('✅ 源数据库连接成功');
    
    // 连接目标数据库
    console.log('📡 连接目标数据库...');
    targetPool = await sql.connect(targetConfig);
    console.log('✅ 目标数据库连接成功');
    
    // 确保使用正确的数据库上下文
    await sourcePool.request().query('USE cyrg2025');
    console.log('✅ 已切换到cyrg2025数据库');
    
    // 1. 检查源数据库中的订单总数 - 严格按照用户提供的SQL查询口径
    console.log('\n📊 检查源数据库订单统计...');
    const orderCountResult = await sourcePool.request().query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(vipAmount + vipAmountZengSong + cash + total) as total_amount,
        CONVERT(DECIMAL(10,2), round(SUM(vipAmount + vipAmountZengSong + cash + total) / CASE WHEN COUNT(*) = 0 THEN 1 ELSE COUNT(*) END, 2)) as avg_order_amount
      FROM dbo.Orders 
      WHERE delflag = 0 
        AND payState IN (1, 2, 3)
    `);
    
    // 检查总用户数量
    const userCountResult = await sourcePool.request().query(`
      SELECT COUNT(*) as total_users 
      FROM (
        SELECT DISTINCT openId AS 用户名称 
        FROM Orders 
        WHERE delflag = 0 
          AND payState IN (1, 2, 3) 
          AND openId != ''
      ) a
    `);
    
    const stats = orderCountResult.recordset[0];
    const userStats = userCountResult.recordset[0];
    
    console.log(`📈 源数据库统计 (严格按照查询口径):`);
    console.log(`   - 总订单数: ${stats.total_orders.toLocaleString()}`);
    console.log(`   - 总用户数: ${userStats.total_users.toLocaleString()}`);
    console.log(`   - 总销售额: ¥${stats.total_amount.toLocaleString()}`);
    console.log(`   - 客单价: ¥${stats.avg_order_amount.toLocaleString()}`);
    
    if (stats.total_orders === 0) {
      console.log('❌ 没有找到符合条件的订单数据');
      return;
    }
    
    // 2. 清空目标数据库表
    console.log('\n🧹 清空目标数据库表...');
    await targetPool.request().query('DELETE FROM hotdog2030.dbo.customer_profiles');
    await targetPool.request().query('DELETE FROM hotdog2030.dbo.customer_orders');
    console.log('✅ 目标表已清空');
    
    // 3. 同步客户数据 - 使用更大的批次大小
    console.log('\n👥 开始同步客户数据...');
    const customerBatchSize = 10000; // 增大批次大小
    let customerOffset = 0;
    let customerCount = 0;
    
    while (customerCount < userStats.total_users) {
      const batchStartTime = Date.now();
      
      const customerBatchResult = await sourcePool.request().query(`
        SELECT
          o.openId as customer_id,
          o.openId as open_id,
          MAX(CAST(o.vipId AS VARCHAR(50))) as vip_num,
          MAX(o.vipTel) as phone,
          NULL as nickname,
          NULL as gender,
          MAX(o.shopName) as city,
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
        GROUP BY o.openId
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
      console.log(`✅ 已同步 ${customerCount} 个客户 (${((customerCount / userStats.total_users) * 100).toFixed(1)}%) - 本批次耗时: ${batchTime}ms`);
      
      // 如果已经同步完所有客户，退出循环
      if (customerCount >= userStats.total_users) {
        console.log(`✅ 客户同步完成，共同步 ${customerCount} 个客户`);
        break;
      }
    }
    
    // 4. 同步订单数据 - 使用更大的批次大小
    console.log('\n📦 开始同步订单数据...');
    const orderBatchSize = 20000; // 增大批次大小
    let orderOffset = 0;
    let orderCount = 0;
    let emptyBatchCount = 0;
    
    while (orderCount < stats.total_orders) {
      const batchStartTime = Date.now();
      console.log(`🔄 正在查询订单批次: OFFSET ${orderOffset}, FETCH ${orderBatchSize}`);
      
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
        ORDER BY o.recordTime DESC
        OFFSET ${orderOffset} ROWS
        FETCH NEXT ${orderBatchSize} ROWS ONLY
      `);
      
      if (orderBatchResult.recordset.length === 0) {
        emptyBatchCount++;
        console.log(`⚠️  批次 ${Math.floor(orderOffset / orderBatchSize) + 1} 返回空结果，已连续 ${emptyBatchCount} 个空批次`);
        
        // 如果连续3个批次都为空，可能已经同步完所有数据
        if (emptyBatchCount >= 3) {
          console.log(`🛑 连续 ${emptyBatchCount} 个批次为空，停止同步`);
          break;
        }
        
        orderOffset += orderBatchSize;
        continue;
      }
      
      // 重置空批次计数
      emptyBatchCount = 0;
      
      // 批量插入订单数据
      await batchInsertOrders(targetPool, orderBatchResult.recordset);
      
      orderCount += orderBatchResult.recordset.length;
      orderOffset += orderBatchSize;
      const batchTime = Date.now() - batchStartTime;
      console.log(`✅ 已同步 ${orderCount} 个订单 (${((orderCount / stats.total_orders) * 100).toFixed(1)}%) - 本批次: ${orderBatchResult.recordset.length} 个 - 耗时: ${batchTime}ms`);
      
      // 如果已经同步完所有订单，退出循环
      if (orderCount >= stats.total_orders) {
        console.log(`✅ 订单同步完成，共同步 ${orderCount} 个订单`);
        break;
      }
    }
    
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
    console.log(`\n🎉 超高性能数据同步完成！总耗时: ${Math.floor(totalTime / 1000)}秒`);
    
  } catch (error) {
    console.error('❌ 同步失败:', error.message);
    throw error;
  } finally {
    if (sourcePool) await sourcePool.close();
    if (targetPool) await targetPool.close();
  }
}

// 运行同步
syncAllOrders().catch(console.error); 