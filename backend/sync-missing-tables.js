const sql = require('mssql');

const cyrg2025Config = {
  server: process.env.cyrg2025_DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.cyrg2025_DB_PORT || '1433'),
  user: process.env.cyrg2025_DB_USER || 'hotdog',
  password: process.env.cyrg2025_DB_PASSWORD || 'Zhkj@62102218',
  database: process.env.cyrg2025_DB_NAME || 'cyrg2025',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
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
    trustServerCertificate: true,
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  }
};

const MAX_RETRIES = 3;

async function connectWithRetry(config, retries = 0) {
  try {
    const pool = await sql.connect(config);
    console.log(`数据库连接成功 (重试次数: ${retries})`);
    return pool;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(`数据库连接失败，${retries + 1}/${MAX_RETRIES} 次重试...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (retries + 1)));
      return connectWithRetry(config, retries + 1);
    }
    throw error;
  }
}

async function executeWithRetry(operation, retries = 0) {
  try {
    return await operation();
  } catch (error) {
    if (retries < MAX_RETRIES && isRetryableError(error)) {
      console.log(`SQL执行失败，${retries + 1}/${MAX_RETRIES} 次重试...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
      return executeWithRetry(operation, retries + 1);
    }
    throw error;
  }
}

function isRetryableError(error) {
  const retryableCodes = ['ESOCKET', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'];
  return retryableCodes.includes(error.code) || 
         error.message?.includes('Connection is closed') ||
         error.message?.includes('timeout');
}

async function syncMissingTables() {
  let cyrg2025Pool = null;
  let hotdogPool = null;

  try {
    console.log('开始同步缺失的表数据...');
    
    // 连接数据库
    cyrg2025Pool = await connectWithRetry(cyrg2025Config);
    hotdogPool = await connectWithRetry(hotdogConfig);
    
    // 切换到hotdog2030数据库
    await executeWithRetry(() => hotdogPool.request().query('USE hotdog2030'));
    console.log('切换到hotdog2030数据库');

    // 1. 同步客户时间分析数据
    console.log('\n=== 同步客户时间分析数据 ===');
    await executeWithRetry(() => hotdogPool.request().query('DELETE FROM customer_time_analysis'));
    
    await executeWithRetry(() => hotdogPool.request().query(`
      INSERT INTO customer_time_analysis (customer_id, hour_of_day, order_count, total_amount, analysis_date, created_at, batch_time)
      SELECT 
        COALESCE(o.openId, CONCAT('CUST_', o.id)) as customer_id,
        DATEPART(HOUR, o.recordTime) as hour_of_day,
        COUNT(*) as order_count,
        SUM(CASE WHEN o.cash > 0 THEN o.cash ELSE o.total END) as total_amount,
        CAST(o.recordTime AS DATE) as analysis_date,
        GETDATE() as created_at,
        GETDATE() as batch_time
      FROM cyrg2025.dbo.Orders o
      WHERE (o.payState = 2 OR o.payState IS NULL)
        AND (o.delflag = 0 OR o.delflag IS NULL)
        AND o.recordTime IS NOT NULL
        AND o.openId IS NOT NULL
      GROUP BY COALESCE(o.openId, CONCAT('CUST_', o.id)), DATEPART(HOUR, o.recordTime), CAST(o.recordTime AS DATE)
    `));
    
    const timeAnalysisCount = await executeWithRetry(() => 
      hotdogPool.request().query('SELECT COUNT(*) as count FROM customer_time_analysis')
    );
    console.log(`客户时间分析数据同步完成: ${timeAnalysisCount.recordset[0].count} 条记录`);

    // 2. 同步客户产品偏好数据
    console.log('\n=== 同步客户产品偏好数据 ===');
    await executeWithRetry(() => hotdogPool.request().query('DELETE FROM customer_product_preferences'));
    
    await executeWithRetry(() => hotdogPool.request().query(`
      INSERT INTO customer_product_preferences (customer_id, category_name, purchase_count, total_amount, preference_score, created_at, batch_time)
      SELECT 
        COALESCE(o.openId, CONCAT('CUST_', o.id)) as customer_id,
        '热狗类' as category_name,
        COUNT(*) as purchase_count,
        SUM(CASE WHEN o.cash > 0 THEN o.cash ELSE o.total END) as total_amount,
        ROUND(COUNT(*) * 1.0 / SUM(COUNT(*)) OVER (PARTITION BY COALESCE(o.openId, CONCAT('CUST_', o.id))), 2) as preference_score,
        GETDATE() as created_at,
        GETDATE() as batch_time
      FROM cyrg2025.dbo.Orders o
      WHERE (o.payState = 2 OR o.payState IS NULL)
        AND (o.delflag = 0 OR o.delflag IS NULL)
        AND o.recordTime IS NOT NULL
        AND o.openId IS NOT NULL
      GROUP BY COALESCE(o.openId, CONCAT('CUST_', o.id))
    `));
    
    const productPreferencesCount = await executeWithRetry(() => 
      hotdogPool.request().query('SELECT COUNT(*) as count FROM customer_product_preferences')
    );
    console.log(`客户产品偏好数据同步完成: ${productPreferencesCount.recordset[0].count} 条记录`);

    // 3. 生成AI营销建议
    console.log('\n=== 生成AI营销建议 ===');
    await executeWithRetry(() => hotdogPool.request().query('DELETE FROM ai_marketing_suggestions'));
    
    await executeWithRetry(() => hotdogPool.request().query(`
      INSERT INTO ai_marketing_suggestions (customer_id, suggestion_type, suggestion_title, suggestion_content, priority, expected_effect, created_at, batch_time)
      SELECT 
        cp.customer_id,
        CASE 
          WHEN cp.customer_segment = '重要价值客户' THEN 'VIP服务'
          WHEN cp.customer_segment = '重要发展客户' THEN '精准营销'
          WHEN cp.customer_segment = '重要挽留客户' THEN '流失预警'
          ELSE '基础营销'
        END as suggestion_type,
        CASE 
          WHEN cp.customer_segment = '重要价值客户' THEN 'VIP客户专属服务'
          WHEN cp.customer_segment = '重要发展客户' THEN '个性化推荐计划'
          WHEN cp.customer_segment = '重要挽留客户' THEN '客户召回计划'
          ELSE '基础营销活动'
        END as suggestion_title,
        CASE 
          WHEN cp.customer_segment = '重要价值客户' THEN '为高价值客户提供专属优惠和优先服务'
          WHEN cp.customer_segment = '重要发展客户' THEN '通过个性化推荐提升客户消费频次'
          WHEN cp.customer_segment = '重要挽留客户' THEN '通过优惠券和关怀信息召回流失客户'
          ELSE '通过基础营销活动提升客户活跃度'
        END as suggestion_content,
        CASE 
          WHEN cp.customer_segment = '重要价值客户' THEN 3
          WHEN cp.customer_segment = '重要发展客户' THEN 2
          WHEN cp.customer_segment = '重要挽留客户' THEN 3
          ELSE 1
        END as priority,
        CASE 
          WHEN cp.customer_segment = '重要价值客户' THEN '提高客户忠诚度和复购率'
          WHEN cp.customer_segment = '重要发展客户' THEN '提升客户价值和消费频次'
          WHEN cp.customer_segment = '重要挽留客户' THEN '防止客户流失，恢复活跃度'
          ELSE '提升客户基础活跃度'
        END as expected_effect,
        GETDATE() as created_at,
        GETDATE() as batch_time
      FROM customer_profiles cp
      WHERE cp.customer_segment IS NOT NULL
    `));
    
    const aiSuggestionsCount = await executeWithRetry(() => 
      hotdogPool.request().query('SELECT COUNT(*) as count FROM ai_marketing_suggestions')
    );
    console.log(`AI营销建议生成完成: ${aiSuggestionsCount.recordset[0].count} 条记录`);

    // 4. 验证所有表的数据
    console.log('\n=== 验证数据同步结果 ===');
    const tables = [
      'customer_profiles',
      'customer_time_analysis', 
      'customer_product_preferences',
      'ai_marketing_suggestions'
    ];

    for (const table of tables) {
      const result = await executeWithRetry(() => 
        hotdogPool.request().query(`SELECT COUNT(*) as count FROM ${table}`)
      );
      console.log(`${table}: ${result.recordset[0].count} 条记录`);
    }

    console.log('\n✅ 所有缺失的表数据同步完成！');

  } catch (error) {
    console.error('同步失败:', error);
    throw error;
  } finally {
    // 确保连接关闭
    if (cyrg2025Pool) {
      try {
        await cyrg2025Pool.close();
        console.log('cyrg2025连接已关闭');
      } catch (error) {
        console.warn('关闭cyrg2025连接失败:', error);
      }
    }
    if (hotdogPool) {
      try {
        await hotdogPool.close();
        console.log('hotdog连接已关闭');
      } catch (error) {
        console.warn('关闭hotdog连接失败:', error);
      }
    }
  }
}

// 运行同步
syncMissingTables()
  .then(() => {
    console.log('同步脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('同步脚本执行失败:', error);
    process.exit(1);
  }); 