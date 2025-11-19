const sql = require('mssql');

const config = {
  server: process.env.cyrg2025_DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.cyrg2025_DB_PORT) || 1433,
  user: process.env.cyrg2025_DB_USER || 'hotdog',
  password: process.env.cyrg2025_DB_PASSWORD || 'Zhkj@62102218',
  database: process.env.cyrg2025_DB_NAME || 'cyrg2025', // 先连接到 cyrg2025 数据库
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function createHotdog2030Database() {
  try {
    console.log('正在连接数据库...');
    const pool = await sql.connect(config);
    console.log('数据库连接成功！\n');

    // 1. 创建新的 hotdog2030 数据库
    console.log('=== 创建 hotdog2030 数据库 ===');
    try {
      await pool.request().query(`
        IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'hotdog2030')
        BEGIN
          CREATE DATABASE hotdog2030;
          PRINT 'hotdog2030 数据库创建成功';
        END
        ELSE
        BEGIN
          PRINT 'hotdog2030 数据库已存在';
        END
      `);
      console.log('✅ hotdog2030 数据库创建/确认完成\n');
    } catch (error) {
      console.error('❌ 创建数据库失败:', error.message);
      return;
    }

    // 2. 切换到 hotdog2030 数据库
    console.log('=== 切换到 hotdog2030 数据库 ===');
    await pool.request().query('USE hotdog2030');
    console.log('✅ 已切换到 hotdog2030 数据库\n');

    // 3. 创建核心业务表
    console.log('=== 创建核心业务表 ===');
    
    // 3.1 企业表
    console.log('创建企业表...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'enterprises')
      CREATE TABLE enterprises (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        enterprise_name NVARCHAR(100) NOT NULL,
        legal_person NVARCHAR(50),
        contact_phone NVARCHAR(50),
        business_license NVARCHAR(100),
        registered_capital DECIMAL(15,2),
        established_date DATE,
        address NVARCHAR(200),
        status VARCHAR(20) DEFAULT 'active',
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      )
    `);

    // 3.2 门店表（重构版）
    console.log('创建门店表...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'stores')
      CREATE TABLE stores (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        store_code NVARCHAR(50) UNIQUE NOT NULL,
        store_name NVARCHAR(100) NOT NULL,
        enterprise_id BIGINT,
        store_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'planning',
        province NVARCHAR(50) NOT NULL,
        city NVARCHAR(50) NOT NULL,
        district NVARCHAR(50) NOT NULL,
        address NVARCHAR(200) NOT NULL,
        longitude DECIMAL(10,7),
        latitude DECIMAL(10,7),
        area_size DECIMAL(8,2),
        rent_amount DECIMAL(10,2),
        investment_amount DECIMAL(12,2),
        expected_revenue DECIMAL(12,2),
        director NVARCHAR(50),
        director_phone NVARCHAR(50),
        business_hours NVARCHAR(100),
        passenger_flow INT,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      )
    `);

    // 3.3 选址表
    console.log('创建选址表...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'site_selections')
      CREATE TABLE site_selections (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        location_name NVARCHAR(100) NOT NULL,
        province NVARCHAR(50) NOT NULL,
        city NVARCHAR(50) NOT NULL,
        district NVARCHAR(50) NOT NULL,
        address NVARCHAR(200) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        latitude DECIMAL(10,7) NOT NULL,
        score DECIMAL(5,2),
        poi_density_score DECIMAL(5,2),
        traffic_score DECIMAL(5,2),
        population_score DECIMAL(5,2),
        competition_score DECIMAL(5,2),
        rent_score DECIMAL(5,2),
        status VARCHAR(20) DEFAULT 'pending',
        investigator_id BIGINT,
        investigation_notes NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      )
    `);

    // 3.4 POI数据表
    console.log('创建POI数据表...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'poi_data')
      CREATE TABLE poi_data (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        poi_name NVARCHAR(100) NOT NULL,
        poi_type VARCHAR(50) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        latitude DECIMAL(10,7) NOT NULL,
        address NVARCHAR(200),
        business_hours NVARCHAR(100),
        data_source VARCHAR(20) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE()
      )
    `);

    // 3.5 用户表
    console.log('创建用户表...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
      CREATE TABLE users (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(50) UNIQUE NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        email NVARCHAR(100),
        phone NVARCHAR(20),
        real_name NVARCHAR(50),
        role VARCHAR(20) DEFAULT 'user',
        enterprise_id BIGINT,
        store_id BIGINT,
        status VARCHAR(20) DEFAULT 'active',
        last_login DATETIME2,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      )
    `);

    // 3.6 商品表
    console.log('创建商品表...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'products')
      CREATE TABLE products (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        product_code NVARCHAR(50) UNIQUE NOT NULL,
        product_name NVARCHAR(100) NOT NULL,
        category_id BIGINT,
        description NVARCHAR(500),
        image_url NVARCHAR(255),
        cost_price DECIMAL(10,2),
        sale_price DECIMAL(10,2),
        market_price DECIMAL(10,2),
        stock_quantity INT DEFAULT 0,
        min_stock INT DEFAULT 0,
        unit NVARCHAR(20),
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      )
    `);

    // 3.7 订单表
    console.log('创建订单表...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'orders')
      CREATE TABLE orders (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        order_no NVARCHAR(50) UNIQUE NOT NULL,
        store_id BIGINT NOT NULL,
        customer_name NVARCHAR(50),
        customer_phone NVARCHAR(20),
        total_amount DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        actual_amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(20),
        payment_status VARCHAR(20) DEFAULT 'pending',
        order_status VARCHAR(20) DEFAULT 'pending',
        remarks NVARCHAR(500),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      )
    `);

    // 3.8 订单明细表
    console.log('创建订单明细表...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'order_items')
      CREATE TABLE order_items (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        order_id BIGINT NOT NULL,
        product_id BIGINT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE()
      )
    `);

    // 4. 创建索引
    console.log('=== 创建索引 ===');
    
    // 门店表索引
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_stores_location')
      CREATE INDEX idx_stores_location ON stores (province, city, district)
    `);
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_stores_coordinates')
      CREATE INDEX idx_stores_coordinates ON stores (longitude, latitude)
    `);

    // 选址表索引
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_site_selections_location')
      CREATE INDEX idx_site_selections_location ON site_selections (province, city, district)
    `);

    // POI表索引
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_poi_data_coordinates')
      CREATE INDEX idx_poi_data_coordinates ON poi_data (longitude, latitude)
    `);

    // 5. 创建外键关系
    console.log('=== 创建外键关系 ===');
    
    // 门店 -> 企业
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_stores_enterprise')
      ALTER TABLE stores ADD CONSTRAINT fk_stores_enterprise 
      FOREIGN KEY (enterprise_id) REFERENCES enterprises(id)
    `);

    // 用户 -> 企业
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_users_enterprise')
      ALTER TABLE users ADD CONSTRAINT fk_users_enterprise 
      FOREIGN KEY (enterprise_id) REFERENCES enterprises(id)
    `);

    // 用户 -> 门店
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_users_store')
      ALTER TABLE users ADD CONSTRAINT fk_users_store 
      FOREIGN KEY (store_id) REFERENCES stores(id)
    `);

    // 订单 -> 门店
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_orders_store')
      ALTER TABLE orders ADD CONSTRAINT fk_orders_store 
      FOREIGN KEY (store_id) REFERENCES stores(id)
    `);

    // 订单明细 -> 订单
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_order_items_order')
      ALTER TABLE order_items ADD CONSTRAINT fk_order_items_order 
      FOREIGN KEY (order_id) REFERENCES orders(id)
    `);

    // 订单明细 -> 商品
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_order_items_product')
      ALTER TABLE order_items ADD CONSTRAINT fk_order_items_product 
      FOREIGN KEY (product_id) REFERENCES products(id)
    `);

    console.log('✅ 所有表、索引和外键创建完成！\n');

    // 6. 插入示例数据
    console.log('=== 插入示例数据 ===');
    
    // 插入企业数据
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM enterprises WHERE enterprise_name = '纯佑热狗连锁')
      INSERT INTO enterprises (enterprise_name, legal_person, contact_phone, business_license, registered_capital, established_date, address)
      VALUES ('纯佑热狗连锁', '张三', '13800138000', 'L123456789', 1000000.00, '2020-01-01', '北京市朝阳区xxx街道xxx号')
    `);

    // 插入门店数据
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM stores WHERE store_code = 'CY001')
      INSERT INTO stores (store_code, store_name, enterprise_id, store_type, status, province, city, district, address, longitude, latitude, area_size, rent_amount, director, director_phone, business_hours)
      VALUES ('CY001', '纯佑热狗朝阳店', 1, 'direct', 'operating', '北京市', '北京市', '朝阳区', '朝阳区xxx街道xxx号', 116.4074, 39.9042, 80.00, 15000.00, '李四', '13900139000', '07:00-22:00')
    `);

    // 插入用户数据
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM users WHERE username = 'admin')
      INSERT INTO users (username, password_hash, email, real_name, role, enterprise_id)
      VALUES ('admin', '$2b$10$example_hash', 'admin@chunyure.com', '系统管理员', 'admin', 1)
    `);

    console.log('✅ 示例数据插入完成！\n');

    // 7. 执行初始化后数据同步（利润更新和门店成立时间）
    console.log('=== 执行初始化后数据同步 ===');
    try {
      const { postInitDataSync } = require('./post-init-data-sync');
      // 传递现有的 pool 连接，避免重复连接
      await postInitDataSync(pool);
    } catch (error) {
      console.error('⚠️  初始化后数据同步失败（可稍后手动执行）:', error.message);
      console.log('   提示: 可以稍后运行 node backend/post-init-data-sync.js 来执行数据同步');
    }

    await pool.close();
    console.log('\n🎉 hotdog2030 数据库创建完成！');

  } catch (error) {
    console.error('❌ 数据库创建失败:', error);
  }
}

createHotdog2030Database(); 