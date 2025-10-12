const mssql = require('mssql');
const logger = require('./src/utils/logger');

// 数据库配置
const dbConfig = {
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// 客户画像同步服务
class CustomerProfileSyncService {
  constructor() {
    this.pool = null;
    this.isRunning = false;
    this.progress = 0;
    this.currentStep = '';
    this.startTime = null;
  }

  async connect() {
    if (!this.pool) {
      this.pool = await mssql.connect(dbConfig);
      logger.info('数据库连接成功');
    }
    return this.pool;
  }

  async createTables() {
    const pool = await this.connect();
    
    const createCustomerProfilesTable = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='customer_profiles' AND xtype='U')
      CREATE TABLE customer_profiles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        customer_id NVARCHAR(100) UNIQUE NOT NULL,
        customer_name NVARCHAR(200),
        phone NVARCHAR(20),
        total_orders INT DEFAULT 0,
        total_spend DECIMAL(10,2) DEFAULT 0,
        first_order_date DATETIME,
        last_order_date DATETIME,
        customer_segment NVARCHAR(50),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
      )
    `;

    const createCustomerOrdersTable = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='customer_orders' AND xtype='U')
      CREATE TABLE customer_orders (
        id INT IDENTITY(1,1) PRIMARY KEY,
        customer_id NVARCHAR(100) NOT NULL,
        order_id NVARCHAR(100) UNIQUE NOT NULL,
        order_date DATETIME,
        order_amount DECIMAL(10,2),
        payment_method NVARCHAR(50),
        shop_name NVARCHAR(200),
        created_at DATETIME DEFAULT GETDATE()
      )
    `;

    const createCustomerAnalysisTable = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='customer_analysis' AND xtype='U')
      CREATE TABLE customer_analysis (
        id INT IDENTITY(1,1) PRIMARY KEY,
        customer_id NVARCHAR(100) UNIQUE NOT NULL,
        avg_order_value DECIMAL(10,2),
        order_frequency DECIMAL(5,2),
        customer_lifetime_value DECIMAL(10,2),
        preferred_products NVARCHAR(500),
        preferred_time NVARCHAR(50),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
      )
    `;

    try {
      await pool.request().query(createCustomerProfilesTable);
      await pool.request().query(createCustomerOrdersTable);
      await pool.request().query(createCustomerAnalysisTable);
      logger.info('客户画像表创建成功');
    } catch (error) {
      logger.error('创建表失败:', error);
      throw error;
    }
  }

  async syncCustomerData() {
    const pool = await this.connect();
    
    const query = `
      INSERT INTO customer_profiles (customer_id, customer_name, phone, total_orders, total_spend, first_order_date, last_order_date, customer_segment)
      SELECT 
        phone as customer_id,
        MAX(customerName) as customer_name,
        phone,
        COUNT(*) as total_orders,
        SUM(CAST(amount AS DECIMAL(10,2))) as total_spend,
        MIN(recordTime) as first_order_date,
        MAX(recordTime) as last_order_date,
        CASE 
          WHEN COUNT(*) >= 20 THEN 'VIP客户'
          WHEN COUNT(*) >= 10 THEN '高价值客户'
          WHEN COUNT(*) >= 5 THEN '中价值客户'
          WHEN COUNT(*) >= 2 THEN '低价值客户'
          ELSE '新客户'
        END as customer_segment
      FROM cyrg2025.dbo.Orders 
      WHERE phone IS NOT NULL 
        AND phone != '' 
        AND phone != 'test'
        AND customerName IS NOT NULL
        AND customerName != ''
      GROUP BY phone
      HAVING COUNT(*) > 0
    `;

    try {
      const result = await pool.request().query(query);
      logger.info(`同步客户数据成功，影响行数: ${result.rowsAffected[0]}`);
      return result.rowsAffected[0];
    } catch (error) {
      logger.error('同步客户数据失败:', error);
      throw error;
    }
  }

  async syncOrderData() {
    const pool = await this.connect();
    
    const query = `
      INSERT INTO customer_orders (customer_id, order_id, order_date, order_amount, payment_method, shop_name)
      SELECT 
        phone as customer_id,
        orderId as order_id,
        recordTime as order_date,
        CAST(amount AS DECIMAL(10,2)) as order_amount,
        paymentMethod as payment_method,
        shopName as shop_name
      FROM cyrg2025.dbo.Orders 
      WHERE phone IS NOT NULL 
        AND phone != '' 
        AND phone != 'test'
        AND orderId IS NOT NULL
        AND orderId != ''
    `;

    try {
      const result = await pool.request().query(query);
      logger.info(`同步订单数据成功，影响行数: ${result.rowsAffected[0]}`);
      return result.rowsAffected[0];
    } catch (error) {
      logger.error('同步订单数据失败:', error);
      throw error;
    }
  }

  async generateAnalysisData() {
    const pool = await this.connect();
    
    const query = `
      INSERT INTO customer_analysis (customer_id, avg_order_value, order_frequency, customer_lifetime_value, preferred_products, preferred_time)
      SELECT 
        cp.customer_id,
        cp.total_spend / cp.total_orders as avg_order_value,
        CAST(cp.total_orders AS FLOAT) / 
          NULLIF(DATEDIFF(day, cp.first_order_date, cp.last_order_date), 0) * 30 as order_frequency,
        cp.total_spend as customer_lifetime_value,
        '热狗,饮料' as preferred_products,
        '12:00-14:00' as preferred_time
      FROM customer_profiles cp
      WHERE cp.total_orders > 0
    `;

    try {
      const result = await pool.request().query(query);
      logger.info(`生成分析数据成功，影响行数: ${result.rowsAffected[0]}`);
      return result.rowsAffected[0];
    } catch (error) {
      logger.error('生成分析数据失败:', error);
      throw error;
    }
  }

  async sync() {
    if (this.isRunning) {
      throw new Error('同步已在运行中');
    }

    this.isRunning = true;
    this.startTime = new Date();
    this.progress = 0;

    try {
      logger.info('开始同步客户画像数据...');

      // 步骤1: 创建表
      this.currentStep = '创建客户画像表';
      this.progress = 20;
      await this.createTables();

      // 步骤2: 同步客户基础数据
      this.currentStep = '同步客户基础数据';
      this.progress = 40;
      await this.syncCustomerData();

      // 步骤3: 同步订单数据
      this.currentStep = '同步客户订单数据';
      this.progress = 60;
      await this.syncOrderData();

      // 步骤4: 生成分析数据
      this.currentStep = '生成分析数据';
      this.progress = 80;
      await this.generateAnalysisData();

      // 步骤5: 完成
      this.currentStep = '同步完成';
      this.progress = 100;

      logger.info('客户画像数据同步完成');
      return {
        success: true,
        message: '同步完成',
        progress: 100,
        currentStep: '同步完成'
      };

    } catch (error) {
      logger.error('同步失败:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      progress: this.progress,
      currentStep: this.currentStep,
      startTime: this.startTime,
      totalSteps: 5
    };
  }
}

// 阿里云函数计算入口
exports.handler = async (event, context) => {
  const syncService = new CustomerProfileSyncService();
  
  try {
    // 检查是否是状态查询
    if (event.action === 'status') {
      return {
        statusCode: 200,
        body: JSON.stringify(syncService.getStatus())
      };
    }

    // 执行同步
    const result = await syncService.sync();
    
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (error) {
    logger.error('函数执行失败:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}; 