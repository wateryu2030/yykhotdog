#!/usr/bin/env node

/**
 * 客户画像定时同步服务
 * 使用方法: 
 * 1. 直接运行: node scheduled-sync.js
 * 2. 定时任务: crontab -e 添加 "0 */6 * * * /path/to/node /path/to/scheduled-sync.js"
 */

const mssql = require('mssql');
const fs = require('fs');
const path = require('path');

// 日志配置
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, `sync-${new Date().toISOString().split('T')[0]}.log`);

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  
  console.log(logMessage.trim());
  fs.appendFileSync(logFile, logMessage);
}

// 数据库配置
const dbConfig = {
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'hotdog2030',
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

// 同步状态文件
const statusFile = path.join(__dirname, 'sync-status.json');

class ScheduledSyncService {
  constructor() {
    this.pool = null;
    this.isRunning = false;
    this.progress = 0;
    this.currentStep = '';
    this.startTime = null;
    this.lastSyncTime = null;
    this.loadStatus();
  }

  loadStatus() {
    try {
      if (fs.existsSync(statusFile)) {
        const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
        this.lastSyncTime = status.lastSyncTime;
        log(`上次同步时间: ${this.lastSyncTime}`);
      }
    } catch (error) {
      log(`加载状态文件失败: ${error.message}`, 'WARN');
    }
  }

  saveStatus() {
    try {
      const status = {
        lastSyncTime: new Date().toISOString(),
        isRunning: this.isRunning,
        progress: this.progress,
        currentStep: this.currentStep,
        startTime: this.startTime
      };
      fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
    } catch (error) {
      log(`保存状态文件失败: ${error.message}`, 'ERROR');
    }
  }

  async connect() {
    if (!this.pool) {
      this.pool = await mssql.connect(dbConfig);
      log('数据库连接成功');
    }
    return this.pool;
  }

  async checkNeedSync() {
    // 检查是否需要同步（比如距离上次同步超过6小时）
    if (!this.lastSyncTime) {
      return true;
    }

    const lastSync = new Date(this.lastSyncTime);
    const now = new Date();
    const hoursDiff = (now - lastSync) / (1000 * 60 * 60);

    return hoursDiff >= 6; // 6小时同步一次
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
      log('客户画像表创建成功');
    } catch (error) {
      log(`创建表失败: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async syncCustomerData() {
    const pool = await this.connect();
    
    // 先清空现有数据
    await pool.request().query('DELETE FROM customer_profiles');
    
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
      log(`同步客户数据成功，影响行数: ${result.rowsAffected[0]}`);
      return result.rowsAffected[0];
    } catch (error) {
      log(`同步客户数据失败: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async syncOrderData() {
    const pool = await this.connect();
    
    // 先清空现有数据
    await pool.request().query('DELETE FROM customer_orders');
    
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
      log(`同步订单数据成功，影响行数: ${result.rowsAffected[0]}`);
      return result.rowsAffected[0];
    } catch (error) {
      log(`同步订单数据失败: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async generateAnalysisData() {
    const pool = await this.connect();
    
    // 先清空现有数据
    await pool.request().query('DELETE FROM customer_analysis');
    
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
      log(`生成分析数据成功，影响行数: ${result.rowsAffected[0]}`);
      return result.rowsAffected[0];
    } catch (error) {
      log(`生成分析数据失败: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async sync() {
    if (this.isRunning) {
      log('同步已在运行中，跳过本次执行', 'WARN');
      return;
    }

    // 检查是否需要同步
    if (!(await this.checkNeedSync())) {
      log('距离上次同步时间不足6小时，跳过本次执行', 'INFO');
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();
    this.progress = 0;

    try {
      log('开始定时同步客户画像数据...');

      // 步骤1: 创建表
      this.currentStep = '创建客户画像表';
      this.progress = 20;
      this.saveStatus();
      await this.createTables();

      // 步骤2: 同步客户基础数据
      this.currentStep = '同步客户基础数据';
      this.progress = 40;
      this.saveStatus();
      await this.syncCustomerData();

      // 步骤3: 同步订单数据
      this.currentStep = '同步客户订单数据';
      this.progress = 60;
      this.saveStatus();
      await this.syncOrderData();

      // 步骤4: 生成分析数据
      this.currentStep = '生成分析数据';
      this.progress = 80;
      this.saveStatus();
      await this.generateAnalysisData();

      // 步骤5: 完成
      this.currentStep = '同步完成';
      this.progress = 100;
      this.saveStatus();

      log('客户画像数据定时同步完成');
      this.lastSyncTime = new Date().toISOString();
      this.saveStatus();

    } catch (error) {
      log(`同步失败: ${error.message}`, 'ERROR');
      throw error;
    } finally {
      this.isRunning = false;
      this.saveStatus();
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      progress: this.progress,
      currentStep: this.currentStep,
      startTime: this.startTime,
      lastSyncTime: this.lastSyncTime,
      totalSteps: 5
    };
  }
}

// 主函数
async function main() {
  const syncService = new ScheduledSyncService();
  
  try {
    log('定时同步服务启动');
    await syncService.sync();
    log('定时同步服务完成');
  } catch (error) {
    log(`定时同步服务失败: ${error.message}`, 'ERROR');
    process.exit(1);
  } finally {
    if (syncService.pool) {
      await syncService.pool.close();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    log(`程序异常退出: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = ScheduledSyncService; 