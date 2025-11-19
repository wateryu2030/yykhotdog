const sql = require('mssql');

/**
 * hotdog2030 数据库初始化后数据同步脚本
 * 功能：
 * 1. 同步订单利润数据（从 cyrg2025/cyrgweixin 的 OrderGoods 表）
 * 2. 同步门店成立时间（从 cyrg2025/cyrgweixin 的 Shop 表）
 */

const config = {
  server: process.env.DB_HOST || process.env.cyrg2025_DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.DB_PORT || process.env.cyrg2025_DB_PORT) || 1433,
  user: process.env.DB_USERNAME || process.env.DB_USER || process.env.cyrg2025_DB_USER || 'hotdog',
  password: process.env.DB_PASSWORD || process.env.cyrg2025_DB_PASSWORD || 'Zhkj@62102218',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 600000, // 10分钟超时
  }
};

const STAGING_TABLE = 'order_profit_staging';

/**
 * 同步订单利润数据
 */
async function syncOrderProfits(pool) {
  console.log('\n=== 同步订单利润数据 ===');
  
  try {
    // 确保使用 hotdog2030 数据库
    await pool.request().query('USE hotdog2030');
    
    // 1. 创建临时表
    console.log('准备利润数据临时表...');
    await pool.request().query(`
      
      IF OBJECT_ID('${STAGING_TABLE}', 'U') IS NULL
      BEGIN
        CREATE TABLE ${STAGING_TABLE} (
          order_id INT NOT NULL,
          total_profit DECIMAL(18,2) NOT NULL
        );
        CREATE INDEX IX_order_profit_staging_order_id ON ${STAGING_TABLE}(order_id);
      END
      ELSE
      BEGIN
        TRUNCATE TABLE ${STAGING_TABLE};
      END
    `);
    console.log('✅ 临时表准备完成');

    // 2. 检查 cyrgweixin.dbo.OrderGoodsSpec 表是否存在
    console.log('检查数据源表...');
    // 需要切换到 master 数据库来查询跨数据库的表信息
    await pool.request().query('USE master');
    const specTableCheck = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_NAME = 'OrderGoodsSpec' 
      AND TABLE_CATALOG = 'cyrgweixin'
    `);
    await pool.request().query('USE hotdog2030');
    const cyrgweixinSpecExists = specTableCheck.recordset[0].count > 0;
    
    if (cyrgweixinSpecExists) {
      console.log('✅ 检测到 cyrgweixin.dbo.OrderGoodsSpec 表，将包含在查询中');
    } else {
      console.log('ℹ️  未检测到 cyrgweixin.dbo.OrderGoodsSpec 表，将跳过');
    }

    // 3. 构建并执行利润聚合查询
    console.log('聚合利润数据（这可能需要几分钟）...');
    const unionParts = [
      `SELECT orderId, ISNULL(profitPrice, 0) AS profit 
       FROM cyrg2025.dbo.OrderGoods WITH (NOLOCK) 
       WHERE delflag = 0 AND (isPackage IS NULL OR isPackage = 0)`,
      `SELECT orderId, ISNULL(profitPrice, 0) AS profit 
       FROM cyrg2025.dbo.OrderGoodsSpec WITH (NOLOCK) 
       WHERE delflag = 0`,
      `SELECT orderId, ISNULL(profitPrice, 0) AS profit 
       FROM cyrgweixin.dbo.OrderGoods WITH (NOLOCK) 
       WHERE delflag = 0 AND (isPackage IS NULL OR isPackage = 0)`
    ];

    if (cyrgweixinSpecExists) {
      unionParts.push(`SELECT orderId, ISNULL(profitPrice, 0) AS profit 
                       FROM cyrgweixin.dbo.OrderGoodsSpec WITH (NOLOCK) 
                       WHERE delflag = 0`);
    }

    // 确保在 hotdog2030 数据库中
    await pool.request().query('USE hotdog2030');
    
    const profitQuery = `
      SET NOCOUNT ON;
      INSERT INTO ${STAGING_TABLE} (order_id, total_profit)
      SELECT orderId, ISNULL(SUM(profit), 0) AS total_profit
      FROM (
        ${unionParts.join(' UNION ALL ')}
      ) t
      WHERE profit IS NOT NULL
      GROUP BY orderId
      HAVING ISNULL(SUM(profit), 0) > 0;
    `;

    const profitResult = await pool.request().query(profitQuery);
    console.log(`✅ 利润数据聚合完成`);

    // 4. 更新 orders 表的 total_profit 字段
    console.log('更新订单利润字段...');
    await pool.request().query(`
      -- 确保 orders 表有 total_profit 字段
      IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID('orders') AND name = 'total_profit'
      )
      BEGIN
        ALTER TABLE orders ADD total_profit DECIMAL(18,2) NULL;
      END
      
      -- 从临时表更新利润
      WITH agg AS (
        SELECT order_id, SUM(total_profit) AS total_profit
        FROM ${STAGING_TABLE}
        GROUP BY order_id
      )
      UPDATE o
      SET o.total_profit = agg.total_profit
      FROM orders o
      INNER JOIN agg ON agg.order_id = o.id;
      
      -- 将 NULL 值设为 0
      UPDATE orders SET total_profit = 0 WHERE total_profit IS NULL;
    `);

    // 获取统计信息
    const statsResult = await pool.request().query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN total_profit IS NOT NULL AND total_profit > 0 THEN 1 ELSE 0 END) as orders_with_profit
      FROM orders
    `);
    const stats = statsResult.recordset[0];
    console.log(`✅ 订单利润更新完成`);
    console.log(`   总订单数: ${stats.total_orders}`);
    console.log(`   有利润数据的订单数: ${stats.orders_with_profit}`);

  } catch (error) {
    console.error('❌ 同步订单利润数据失败:', error.message);
    throw error;
  }
}

/**
 * 同步门店成立时间
 */
async function syncStoreOpenDates(pool) {
  console.log('\n=== 同步门店成立时间 ===');
  
  try {
    // 确保使用 hotdog2030 数据库
    await pool.request().query('USE hotdog2030');
    
    // 1. 确保 stores 表有 open_date 字段
    console.log('检查 stores 表结构...');
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID('stores') AND name = 'open_date'
      )
      BEGIN
        ALTER TABLE stores ADD open_date DATETIME2 NULL;
      END
    `);
    console.log('✅ stores 表结构检查完成');

    // 2. 从 cyrg2025 获取门店成立时间
    console.log('从 cyrg2025 获取门店成立时间...');
    // 使用跨数据库查询，直接指定数据库名
    const cyrg2025Query = `
      SELECT 
        Id AS store_id,
        ShopName AS store_name,
        CASE WHEN ISDATE(openingTime) = 1 THEN CAST(openingTime AS datetime) ELSE NULL END AS opening_time,
        CASE WHEN ISDATE(establishTime) = 1 THEN CAST(establishTime AS datetime) ELSE NULL END AS establish_time,
        CASE WHEN ISDATE(RecordTime) = 1 THEN CAST(RecordTime AS datetime) ELSE NULL END AS record_time
      FROM cyrg2025.dbo.Shop WITH (NOLOCK)
      WHERE delflag = 0
    `;

    const cyrg2025Result = await pool.request().query(cyrg2025Query);
    const openDates = new Map();

    // 处理 cyrg2025 的数据
    for (const row of cyrg2025Result.recordset) {
      const storeId = row.store_id;
      const candidates = [
        row.opening_time,
        row.establish_time,
        row.record_time
      ].filter(dt => dt != null);

      if (candidates.length > 0) {
        const earliestDate = new Date(Math.min(...candidates.map(d => new Date(d))));
        if (!openDates.has(storeId) || earliestDate < openDates.get(storeId)) {
          openDates.set(storeId, earliestDate);
        }
      }
    }
    console.log(`✅ 从 cyrg2025 获取到 ${openDates.size} 个门店的成立时间`);

    // 3. 更新 hotdog2030.stores 表
    if (openDates.size > 0) {
      console.log('更新门店成立时间...');
      let updateCount = 0;
      let missingCount = 0;

      // 获取现有的门店ID
      const existingStores = await pool.request().query(`
        SELECT id FROM stores WITH (NOLOCK)
      `);
      const existingStoreIds = new Set(existingStores.recordset.map(r => r.id));

      // 批量更新
      const updates = [];
      for (const [storeId, openDate] of openDates.entries()) {
        if (existingStoreIds.has(storeId)) {
          updates.push({ storeId, openDate });
        } else {
          missingCount++;
        }
      }

      // 执行批量更新
      if (updates.length > 0) {
        for (const { storeId, openDate } of updates) {
          await pool.request()
            .input('openDate', sql.DateTime2, openDate)
            .input('storeId', sql.Int, storeId)
            .query(`
              UPDATE stores 
              SET open_date = @openDate 
              WHERE id = @storeId
            `);
          updateCount++;
        }
        console.log(`✅ 成功更新 ${updateCount} 个门店的成立时间`);
      }

      if (missingCount > 0) {
        console.log(`⚠️  有 ${missingCount} 个门店ID在 hotdog2030 中不存在`);
      }
    } else {
      console.log('ℹ️  没有找到门店成立时间数据');
    }

  } catch (error) {
    console.error('❌ 同步门店成立时间失败:', error.message);
    throw error;
  }
}

/**
 * 主函数
 * @param {sql.ConnectionPool} existingPool - 可选的现有数据库连接池
 */
async function postInitDataSync(existingPool = null) {
  let pool = existingPool;
  let shouldClosePool = false;
  
  try {
    console.log('🚀 开始数据库初始化后数据同步...\n');
    
    // 连接到数据库（如果 pool 未传入，则创建新连接）
    if (!pool) {
      console.log('连接数据库...');
      pool = await sql.connect({
        ...config,
        database: 'hotdog2030'
      });
      shouldClosePool = true;
      console.log('✅ 数据库连接成功\n');
    } else {
      // 确保使用正确的数据库
      await pool.request().query('USE hotdog2030');
    }

    // 执行数据同步
    await syncOrderProfits(pool);
    await syncStoreOpenDates(pool);

    console.log('\n✅ 数据库初始化后数据同步完成！');
    
  } catch (error) {
    console.error('\n❌ 数据同步失败:', error);
    process.exit(1);
  } finally {
    // 只有在函数内部创建的连接才关闭
    // 如果是从外部传入的 pool，不关闭它
    if (pool && shouldClosePool) {
      await pool.close();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  postInitDataSync();
}

module.exports = { postInitDataSync, syncOrderProfits, syncStoreOpenDates };

