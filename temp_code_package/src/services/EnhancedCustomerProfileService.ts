import sql from 'mssql';
import logger from '../utils/logger';

interface SyncProgress {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  totalRecords: number;
  processedRecords: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export default class EnhancedCustomerProfileService {
  private cyrg2025Config = {
    server: process.env.CARGO_DB_HOST || 'localhost',
    port: parseInt(process.env.CARGO_DB_PORT || '1433'),
    user: process.env.CARGO_DB_USER || 'sa',
    password: process.env.CARGO_DB_PASSWORD || 'your_local_password_here',
    database: process.env.CARGO_DB_NAME || 'cyrg2025',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectionTimeout: 30000,
      requestTimeout: 30000,
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    },
  };

  private hotdogConfig = {
    server: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'your_local_password_here',
    database: process.env.DB_NAME || 'hotdog2030',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectionTimeout: 30000,
      requestTimeout: 30000,
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    },
  };

  private syncTasks: Map<string, SyncProgress> = new Map();
  private readonly BATCH_SIZE = 500; // 减小批次大小以提高稳定性
  private readonly MAX_RETRIES = 3; // 最大重试次数

  /**
   * 带重试机制的数据库连接
   */
  private async connectWithRetry(config: any, retries: number = 0): Promise<sql.ConnectionPool> {
    try {
      const pool = await sql.connect(config);
      logger.info(`数据库连接成功 (重试次数: ${retries})`);
      return pool;
    } catch (error) {
      if (retries < this.MAX_RETRIES) {
        logger.warn(`数据库连接失败，${retries + 1}/${this.MAX_RETRIES} 次重试...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retries + 1))); // 指数退避
        return this.connectWithRetry(config, retries + 1);
      }
      throw error;
    }
  }

  /**
   * 带重试机制的SQL执行
   */
  private async executeWithRetry<T>(operation: () => Promise<T>, retries: number = 0): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries < this.MAX_RETRIES && this.isRetryableError(error)) {
        logger.warn(`SQL执行失败，${retries + 1}/${this.MAX_RETRIES} 次重试...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
        return this.executeWithRetry(operation, retries + 1);
      }
      throw error;
    }
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: any): boolean {
    const retryableCodes = ['ESOCKET', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'];
    return (
      retryableCodes.includes(error.code) ||
      error.message?.includes('Connection is closed') ||
      error.message?.includes('timeout')
    );
  }

  /**
   * 开始异步数据同步
   */
  async startAsyncSync(): Promise<string> {
    const taskId = `sync_${Date.now()}`;

    const progress: SyncProgress = {
      taskId,
      status: 'pending',
      progress: 0,
      currentStep: '初始化',
      totalRecords: 0,
      processedRecords: 0,
      startTime: new Date(),
    };

    this.syncTasks.set(taskId, progress);

    // 异步执行同步任务
    this.executeSyncTask(taskId).catch(error => {
      logger.error(`同步任务失败: ${taskId}`, error);
      const task = this.syncTasks.get(taskId);
      if (task) {
        task.status = 'failed';
        task.error = error.message;
        task.endTime = new Date();
      }
    });

    return taskId;
  }

  /**
   * 执行同步任务
   */
  private async executeSyncTask(taskId: string): Promise<void> {
    const progress = this.syncTasks.get(taskId);
    if (!progress) return;

    let cyrg2025Pool: sql.ConnectionPool | null = null;
    let hotdogPool: sql.ConnectionPool | null = null;

    try {
      progress.status = 'running';
      progress.currentStep = '连接数据库';
      progress.progress = 5;

      // 使用重试机制连接数据库
      cyrg2025Pool = await this.connectWithRetry(this.cyrg2025Config);
      hotdogPool = await this.connectWithRetry(this.hotdogConfig);

      // 显式切换到hotdog2030数据库
      await this.executeWithRetry(() => hotdogPool!.request().query('USE hotdog2030'));
      logger.info('切换到hotdog2030数据库');

      // 获取总记录数
      progress.currentStep = '统计记录数';
      progress.progress = 10;

      const countResult = await this.executeWithRetry(() =>
        cyrg2025Pool!.request().query(`
          SELECT COUNT(DISTINCT o.openId) as total_customers
          FROM cyrg2025.dbo.Orders o
          WHERE (o.payState = 2 OR o.payState IS NULL)
            AND (o.Delflag = 0 OR o.Delflag IS NULL)
            AND o.recordTime IS NOT NULL
        `)
      );

      progress.totalRecords = (countResult as any).recordset[0].total_customers;
      logger.info(`总客户数: ${progress.totalRecords}`);

      // 1. 同步客户基础数据
      await this.syncCustomerProfiles(progress, cyrg2025Pool, hotdogPool);

      // 2. 同步客户时间分析数据
      await this.syncCustomerTimeAnalysis(progress, cyrg2025Pool, hotdogPool);

      // 3. 同步客户产品偏好数据
      await this.syncCustomerProductPreferences(progress, cyrg2025Pool, hotdogPool);

      // 4. 生成AI营销建议
      await this.generateAIMarketingSuggestions(progress, hotdogPool);

      // 完成同步
      progress.status = 'completed';
      progress.progress = 100;
      progress.currentStep = '同步完成';
      progress.endTime = new Date();

      logger.info(`同步任务完成: ${taskId}`);
    } catch (error) {
      logger.error(`同步任务失败: ${taskId}`, error);
      progress.status = 'failed';
      progress.error = error.message;
      progress.endTime = new Date();
      throw error;
    } finally {
      // 确保连接关闭
      if (cyrg2025Pool) {
        try {
          await cyrg2025Pool.close();
        } catch (error) {
          logger.warn('关闭cyrg2025连接失败:', error);
        }
      }
      if (hotdogPool) {
        try {
          await hotdogPool.close();
        } catch (error) {
          logger.warn('关闭hotdog连接失败:', error);
        }
      }
    }
  }

  /**
   * 同步客户基础数据
   */
  private async syncCustomerProfiles(
    progress: SyncProgress,
    cyrg2025Pool: sql.ConnectionPool,
    hotdogPool: sql.ConnectionPool
  ): Promise<void> {
    progress.currentStep = '同步客户基础数据';
    progress.progress = 15;

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batchResult = await this.executeWithRetry(() =>
        cyrg2025Pool.request().query(`
          SELECT DISTINCT
            COALESCE(o.openId, CONCAT('CUST_', MIN(o.id))) as customer_id,
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
            AND (o.Delflag = 0 OR o.Delflag IS NULL)
            AND o.recordTime IS NOT NULL
          GROUP BY o.openId, o.vipId, o.vipTel
          ORDER BY o.openId
          OFFSET ${offset} ROWS
          FETCH NEXT ${this.BATCH_SIZE} ROWS ONLY
        `)
      );

      if ((batchResult as any).recordset.length === 0) {
        hasMore = false;
        break;
      }

      // 批量插入数据
      await this.batchInsertCustomerProfiles(hotdogPool, (batchResult as any).recordset);

      offset += this.BATCH_SIZE;
      progress.processedRecords = Math.min(offset, progress.totalRecords);
      progress.progress = 15 + Math.floor((progress.processedRecords / progress.totalRecords) * 20);

      logger.info(`已处理客户数据 ${progress.processedRecords}/${progress.totalRecords} 条记录`);

      // 避免阻塞太久，给其他请求机会
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  /**
   * 同步客户时间分析数据
   */
  private async syncCustomerTimeAnalysis(
    progress: SyncProgress,
    cyrg2025Pool: sql.ConnectionPool,
    hotdogPool: sql.ConnectionPool
  ): Promise<void> {
    progress.currentStep = '同步客户时间分析数据';
    progress.progress = 40;

    try {
      // 清空现有数据
      await this.executeWithRetry(() =>
        hotdogPool.request().query('DELETE FROM customer_time_analysis')
      );

      // 插入时间分析数据
      await this.executeWithRetry(() =>
        hotdogPool.request().query(`
          INSERT INTO customer_time_analysis (customer_id, hour_of_day, order_count, total_amount, created_at, batch_time)
          SELECT 
            o.openId as customer_id,
            DATEPART(HOUR, o.recordTime) as hour_of_day,
            COUNT(*) as order_count,
            SUM(CASE WHEN o.cash > 0 THEN o.cash ELSE o.total END) as total_amount,
            GETDATE() as created_at,
            GETDATE() as batch_time
          FROM cyrg2025.dbo.Orders o
          WHERE (o.payState = 2 OR o.payState IS NULL)
            AND (o.Delflag = 0 OR o.Delflag IS NULL)
            AND o.recordTime IS NOT NULL
          GROUP BY o.openId, DATEPART(HOUR, o.recordTime)
        `)
      );

      logger.info('客户时间分析数据同步完成');
      progress.progress = 50;
    } catch (error) {
      logger.error('同步客户时间分析数据失败:', error);
      throw error;
    }
  }

  /**
   * 同步客户产品偏好数据
   */
  private async syncCustomerProductPreferences(
    progress: SyncProgress,
    cyrg2025Pool: sql.ConnectionPool,
    hotdogPool: sql.ConnectionPool
  ): Promise<void> {
    progress.currentStep = '同步客户产品偏好数据';
    progress.progress = 60;

    try {
      // 清空现有数据
      await this.executeWithRetry(() =>
        hotdogPool.request().query('DELETE FROM customer_product_preferences')
      );

      // 插入产品偏好数据（这里使用模拟数据，实际应该从订单详情表获取）
      await this.executeWithRetry(() =>
        hotdogPool.request().query(`
          INSERT INTO customer_product_preferences (customer_id, product_category, order_count, total_amount, preference_score, created_at, batch_time)
          SELECT 
            o.openId as customer_id,
            '热狗类' as product_category,
            COUNT(*) as order_count,
            SUM(CASE WHEN o.cash > 0 THEN o.cash ELSE o.total END) as total_amount,
            ROUND(COUNT(*) * 1.0 / SUM(COUNT(*)) OVER (PARTITION BY o.openId), 2) as preference_score,
            GETDATE() as created_at,
            GETDATE() as batch_time
          FROM cyrg2025.dbo.Orders o
          WHERE (o.payState = 2 OR o.payState IS NULL)
            AND (o.Delflag = 0 OR o.Delflag IS NULL)
            AND o.recordTime IS NOT NULL
          GROUP BY o.openId
        `)
      );

      logger.info('客户产品偏好数据同步完成');
      progress.progress = 70;
    } catch (error) {
      logger.error('同步客户产品偏好数据失败:', error);
      throw error;
    }
  }

  /**
   * 生成AI营销建议
   */
  private async generateAIMarketingSuggestions(
    progress: SyncProgress,
    hotdogPool: sql.ConnectionPool
  ): Promise<void> {
    progress.currentStep = '生成AI营销建议';
    progress.progress = 80;

    try {
      // 清空现有数据
      await this.executeWithRetry(() =>
        hotdogPool.request().query('DELETE FROM ai_marketing_suggestions')
      );

      // 基于客户分层生成营销建议
      await this.executeWithRetry(() =>
        hotdogPool.request().query(`
          INSERT INTO ai_marketing_suggestions (customer_segment, suggestion_type, suggestion_title, suggestion_content, priority, expected_effect, created_at, batch_time)
          SELECT 
            cp.customer_segment,
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
          GROUP BY cp.customer_segment
        `)
      );

      logger.info('AI营销建议生成完成');
      progress.progress = 90;
    } catch (error) {
      logger.error('生成AI营销建议失败:', error);
      throw error;
    }
  }

  /**
   * 批量插入客户画像数据
   */
  private async batchInsertCustomerProfiles(
    pool: sql.ConnectionPool,
    records: any[]
  ): Promise<void> {
    if (records.length === 0) return;

    const batchTime = new Date().toISOString();

    // 使用MERGE语句进行UPSERT操作
    for (const record of records) {
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
        order_frequency: this.calculateOrderFrequency(
          record.first_order_date,
          record.last_order_date,
          record.total_orders
        ),
        customer_lifetime_value: record.total_spend || 0,
        rfm_score: this.calculateRFMScore(
          record.last_order_date,
          record.total_orders,
          record.total_spend
        ),
        customer_segment: this.calculateCustomerSegment(
          record.last_order_date,
          record.total_orders,
          record.total_spend
        ),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        batch_time: batchTime,
      };

      await this.executeWithRetry(() =>
        pool
          .request()
          .input('customer_id', sql.VarChar, customerProfile.customer_id)
          .input('open_id', sql.VarChar, customerProfile.open_id)
          .input('vip_num', sql.VarChar, customerProfile.vip_num)
          .input('phone', sql.VarChar, customerProfile.phone)
          .input('nickname', sql.VarChar, customerProfile.nickname)
          .input('gender', sql.Int, customerProfile.gender)
          .input('city', sql.VarChar, customerProfile.city)
          .input('district', sql.VarChar, customerProfile.district)
          .input('first_order_date', sql.Date, customerProfile.first_order_date)
          .input('last_order_date', sql.Date, customerProfile.last_order_date)
          .input('total_orders', sql.Int, customerProfile.total_orders)
          .input('total_spend', sql.Decimal(10, 2), customerProfile.total_spend)
          .input('avg_order_amount', sql.Decimal(10, 2), customerProfile.avg_order_amount)
          .input('order_frequency', sql.Decimal(5, 2), customerProfile.order_frequency)
          .input(
            'customer_lifetime_value',
            sql.Decimal(10, 2),
            customerProfile.customer_lifetime_value
          )
          .input('rfm_score', sql.VarChar, customerProfile.rfm_score)
          .input('customer_segment', sql.VarChar, customerProfile.customer_segment)
          .input('is_active', sql.Bit, customerProfile.is_active)
          .input('created_at', sql.DateTime, customerProfile.created_at)
          .input('updated_at', sql.DateTime, customerProfile.updated_at)
          .input('batch_time', sql.DateTime, customerProfile.batch_time).query(`
            MERGE customer_profiles AS target
            USING (SELECT @customer_id as customer_id) AS source
            ON target.customer_id = source.customer_id
            WHEN MATCHED THEN
              UPDATE SET
                open_id = @open_id,
                vip_num = @vip_num,
                phone = @phone,
                nickname = @nickname,
                gender = @gender,
                city = @city,
                district = @district,
                first_order_date = @first_order_date,
                last_order_date = @last_order_date,
                total_orders = @total_orders,
                total_spend = @total_spend,
                avg_order_amount = @avg_order_amount,
                order_frequency = @order_frequency,
                customer_lifetime_value = @customer_lifetime_value,
                rfm_score = @rfm_score,
                customer_segment = @customer_segment,
                is_active = @is_active,
                updated_at = @updated_at,
                batch_time = @batch_time
            WHEN NOT MATCHED THEN
              INSERT (
                customer_id, open_id, vip_num, phone, nickname, gender, city, district,
                first_order_date, last_order_date, total_orders, total_spend, avg_order_amount,
                order_frequency, customer_lifetime_value, rfm_score, customer_segment,
                is_active, created_at, updated_at, batch_time
              )
              VALUES (
                @customer_id, @open_id, @vip_num, @phone, @nickname, @gender, @city, @district,
                @first_order_date, @last_order_date, @total_orders, @total_spend, @avg_order_amount,
                @order_frequency, @customer_lifetime_value, @rfm_score, @customer_segment,
                @is_active, @created_at, @updated_at, @batch_time
              );
          `)
      );
    }
  }

  /**
   * 获取同步任务状态
   */
  async getSyncStatus(taskId: string): Promise<SyncProgress | null> {
    return this.syncTasks.get(taskId) || null;
  }

  /**
   * 获取所有同步任务
   */
  async getAllSyncTasks(): Promise<SyncProgress[]> {
    return Array.from(this.syncTasks.values());
  }

  /**
   * 取消同步任务
   */
  async cancelSyncTask(taskId: string): Promise<boolean> {
    const task = this.syncTasks.get(taskId);
    if (task && task.status === 'running') {
      task.status = 'failed';
      task.error = '任务被用户取消';
      task.endTime = new Date();
      return true;
    }
    return false;
  }

  /**
   * 计算RFM评分
   */
  private calculateRFMScore(lastOrderDate: Date, frequency: number, monetary: number): string {
    const now = new Date();
    const daysSinceLastOrder = Math.floor(
      (now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let r = 1; // Recency
    if (daysSinceLastOrder <= 30) r = 5;
    else if (daysSinceLastOrder <= 60) r = 4;
    else if (daysSinceLastOrder <= 90) r = 3;
    else if (daysSinceLastOrder <= 180) r = 2;

    let f = 1; // Frequency
    if (frequency >= 20) f = 5;
    else if (frequency >= 10) f = 4;
    else if (frequency >= 5) f = 3;
    else if (frequency >= 2) f = 2;

    let m = 1; // Monetary
    if (monetary >= 10000) m = 5;
    else if (monetary >= 5000) m = 4;
    else if (monetary >= 1000) m = 3;
    else if (monetary >= 500) m = 2;

    return `${r}${f}${m}`;
  }

  /**
   * 计算客户分群
   */
  private calculateCustomerSegment(
    lastOrderDate: Date,
    frequency: number,
    monetary: number
  ): string {
    const rfmScore = this.calculateRFMScore(lastOrderDate, frequency, monetary);
    const score = parseInt(rfmScore);

    if (score >= 400) return '重要价值客户';
    if (score >= 300) return '重要发展客户';
    if (score >= 200) return '重要挽留客户';
    return '低价值客户';
  }

  /**
   * 计算订单频率
   */
  private calculateOrderFrequency(
    firstOrderDate: Date,
    lastOrderDate: Date,
    totalOrders: number
  ): number {
    if (!firstOrderDate || !lastOrderDate || totalOrders <= 1) return 0;

    const daysDiff = Math.floor(
      (lastOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff === 0) return totalOrders;

    return Math.round((totalOrders / daysDiff) * 30 * 100) / 100; // 每月订单数
  }

  /**
   * 计算年龄组
   */
  private calculateAgeGroup(gender: number): string {
    return '未知';
  }
}
