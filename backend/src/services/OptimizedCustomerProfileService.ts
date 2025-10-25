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

export default class OptimizedCustomerProfileService {
  private cyrg2025Config = {
    server: process.env.CARGO_DB_HOST || 'localhost',
    port: parseInt(process.env.CARGO_DB_PORT || '1433'),
    user: process.env.CARGO_DB_USER || 'sa',
    password: process.env.CARGO_DB_PASSWORD || 'your_local_password_here',
    database: process.env.CARGO_DB_NAME || 'cyrg2025',
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  };

  private hotdogConfig = {
    server: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'your_local_password_here',
    database: process.env.DB_NAME || 'hotdog2030',
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  };

  private syncTasks: Map<string, SyncProgress> = new Map();
  private readonly BATCH_SIZE = 1000; // 每批处理1000条记录

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
      startTime: new Date()
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

    try {
      progress.status = 'running';
      progress.currentStep = '连接数据库';
      progress.progress = 5;

      const cyrg2025Pool = await sql.connect(this.cyrg2025Config);
      const hotdogPool = await sql.connect(this.hotdogConfig);
      
      // 显式切换到hotdog2030数据库
      await hotdogPool.request().query('USE hotdog2030');
      logger.info('切换到hotdog2030数据库');

      // 获取总记录数
      progress.currentStep = '统计记录数';
      progress.progress = 10;
      
      const countResult = await cyrg2025Pool.request().query(`
        SELECT COUNT(DISTINCT o.openId) as total_customers
        FROM cyrg2025.dbo.Orders o
        WHERE (o.payState = 2 OR o.payState IS NULL)
          AND (o.Delflag = 0 OR o.Delflag IS NULL)
          AND o.recordTime IS NOT NULL
      `);
      
      progress.totalRecords = countResult.recordset[0].total_customers;
      logger.info(`总客户数: ${progress.totalRecords}`);

      // 分批处理客户数据
      progress.currentStep = '同步客户基础数据';
      progress.progress = 15;

      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const batchResult = await cyrg2025Pool.request().query(`
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
        `);

        if (batchResult.recordset.length === 0) {
          hasMore = false;
          break;
        }

        // 批量插入数据
        await this.batchInsertCustomerProfiles(hotdogPool, batchResult.recordset);
        
        offset += this.BATCH_SIZE;
        progress.processedRecords = Math.min(offset, progress.totalRecords);
        progress.progress = 15 + Math.floor((progress.processedRecords / progress.totalRecords) * 70);

        logger.info(`已处理 ${progress.processedRecords}/${progress.totalRecords} 条记录`);
        
        // 避免阻塞太久，给其他请求机会
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 完成同步
      progress.status = 'completed';
      progress.progress = 100;
      progress.currentStep = '同步完成';
      progress.endTime = new Date();

      await cyrg2025Pool.close();
      await hotdogPool.close();

      logger.info(`同步任务完成: ${taskId}`);

    } catch (error) {
      logger.error(`同步任务失败: ${taskId}`, error);
      progress.status = 'failed';
      progress.error = error.message;
      progress.endTime = new Date();
      throw error;
    }
  }

  /**
   * 批量插入客户画像数据
   */
  private async batchInsertCustomerProfiles(pool: sql.ConnectionPool, records: any[]): Promise<void> {
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
        order_frequency: this.calculateOrderFrequency(record.first_order_date, record.last_order_date, record.total_orders),
        customer_lifetime_value: record.total_spend || 0,
        age_group: this.calculateAgeGroup(record.gender),
        rfm_score: this.calculateRFMScore(record.last_order_date, record.total_orders, record.total_spend),
        customer_segment: this.calculateCustomerSegment(record.last_order_date, record.total_orders, record.total_spend),
        batch_time: batchTime
      };

      const mergeSQL = `
        MERGE customer_profiles AS target
        USING (SELECT 
          '${customerProfile.customer_id}' as customer_id,
          ${customerProfile.open_id ? `'${customerProfile.open_id}'` : 'NULL'} as open_id,
          ${customerProfile.vip_num ? `'${customerProfile.vip_num}'` : 'NULL'} as vip_num,
          ${customerProfile.phone ? `'${customerProfile.phone}'` : 'NULL'} as phone,
          ${customerProfile.nickname ? `'${customerProfile.nickname}'` : 'NULL'} as nickname,
          ${customerProfile.gender || 'NULL'} as gender,
          ${customerProfile.city ? `'${customerProfile.city}'` : 'NULL'} as city,
          ${customerProfile.district ? `'${customerProfile.district}'` : 'NULL'} as district,
          ${customerProfile.first_order_date ? `'${customerProfile.first_order_date.toISOString()}'` : 'NULL'} as first_order_date,
          ${customerProfile.last_order_date ? `'${customerProfile.last_order_date.toISOString()}'` : 'NULL'} as last_order_date,
          ${customerProfile.total_orders} as total_orders,
          ${customerProfile.total_spend} as total_spend,
          ${customerProfile.avg_order_amount} as avg_order_amount,
          ${customerProfile.order_frequency} as order_frequency,
          ${customerProfile.customer_lifetime_value} as customer_lifetime_value,
          ${customerProfile.rfm_score ? `'${customerProfile.rfm_score}'` : 'NULL'} as rfm_score,
          ${customerProfile.customer_segment ? `'${customerProfile.customer_segment}'` : 'NULL'} as customer_segment,
          '${customerProfile.batch_time}' as batch_time
        ) AS source
        ON target.customer_id = source.customer_id
        WHEN MATCHED THEN
          UPDATE SET
            open_id = source.open_id,
            vip_num = source.vip_num,
            phone = source.phone,
            nickname = source.nickname,
            gender = source.gender,
            city = source.city,
            district = source.district,
            first_order_date = source.first_order_date,
            last_order_date = source.last_order_date,
            total_orders = source.total_orders,
            total_spend = source.total_spend,
            avg_order_amount = source.avg_order_amount,
            order_frequency = source.order_frequency,
            customer_lifetime_value = source.customer_lifetime_value,
            rfm_score = source.rfm_score,
            customer_segment = source.customer_segment,
            batch_time = source.batch_time,
            updated_at = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (
            customer_id, open_id, vip_num, phone, nickname, gender, city, district,
            first_order_date, last_order_date, total_orders, total_spend, avg_order_amount,
            order_frequency, customer_lifetime_value, rfm_score, customer_segment, batch_time
          )
          VALUES (
            source.customer_id, source.open_id, source.vip_num, source.phone, source.nickname,
            source.gender, source.city, source.district, source.first_order_date, source.last_order_date,
            source.total_orders, source.total_spend, source.avg_order_amount, source.order_frequency,
            source.customer_lifetime_value, source.rfm_score, source.customer_segment, source.batch_time
          );
      `;

      await pool.request().query(mergeSQL);
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
      task.error = '任务被取消';
      task.endTime = new Date();
      logger.info(`取消同步任务: ${taskId}`);
      return true;
    }
    return false;
  }

  // 辅助方法
  private calculateRFMScore(lastOrderDate: Date, frequency: number, monetary: number): string {
    const now = new Date();
    const recency = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let r_score = 1, f_score = 1, m_score = 1;
    
    if (recency <= 30) r_score = 5;
    else if (recency <= 60) r_score = 4;
    else if (recency <= 90) r_score = 3;
    else if (recency <= 180) r_score = 2;
    
    if (frequency >= 10) f_score = 5;
    else if (frequency >= 5) f_score = 4;
    else if (frequency >= 3) f_score = 3;
    else if (frequency >= 2) f_score = 2;
    
    if (monetary >= 1000) m_score = 5;
    else if (monetary >= 500) m_score = 4;
    else if (monetary >= 200) m_score = 3;
    else if (monetary >= 100) m_score = 2;
    
    return `${r_score}${f_score}${m_score}`;
  }

  private calculateCustomerSegment(lastOrderDate: Date, frequency: number, monetary: number): string {
    const now = new Date();
    const recency = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (recency <= 30 && frequency >= 5 && monetary >= 1000) return '重要价值客户';
    if (recency <= 90 && frequency >= 3 && monetary >= 500) return '重要发展客户';
    if (recency <= 180 && frequency >= 2 && monetary >= 200) return '重要挽留客户';
    return '低价值客户';
  }

  private calculateOrderFrequency(firstOrderDate: Date, lastOrderDate: Date, totalOrders: number): number {
    if (!firstOrderDate || !lastOrderDate || totalOrders <= 1) return 0;
    const days = Math.floor((lastOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? totalOrders / days : 0;
  }

  private calculateAgeGroup(gender: number): string {
    return '未知';
  }
} 