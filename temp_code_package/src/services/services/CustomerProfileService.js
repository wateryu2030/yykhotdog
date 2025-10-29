"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mssql_1 = require("mssql");
const logger_1 = require("../utils/logger");
class CustomerProfileService {
    constructor() {
        this.cyrg2025Config = {
            server: process.env.cyrg2025_DB_HOST || 'localhost',
            port: parseInt(process.env.cyrg2025_DB_PORT || '1433'),
            user: process.env.cyrg2025_DB_USER || 'sa',
            password: process.env.cyrg2025_DB_PASSWORD || 'YourStrong@Passw0rd',
            database: process.env.cyrg2025_DB_NAME || 'cyrg2025',
            options: {
                encrypt: false,
                trustServerCertificate: true
            }
        };
        this.hotdogConfig = {
            server: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '1433'),
            user: process.env.DB_USERNAME || 'sa',
            password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
            database: process.env.DB_NAME || 'hotdog2030',
            options: {
                encrypt: false,
                trustServerCertificate: true
            }
        };
    }
    /**
     * 从cyrg2025数据库同步客户基础数据
     */
    async syncCustomerProfiles() {
        try {
            logger_1.default.info('开始同步客户基础数据...');
            const cyrg2025Pool = await mssql_1.default.connect(this.cyrg2025Config);
            const hotdogPool = await mssql_1.default.connect(this.hotdogConfig);
            // 显式切换到hotdog2030数据库
            await hotdogPool.request().query('USE hotdog2030');
            logger_1.default.info('切换到hotdog2030数据库');
            // 查询客户基础数据
            const customerQuery = `
        SELECT DISTINCT
          COALESCE(o.openId, CONCAT('CUST_', o.id)) as customer_id,
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
          AND (o.delflag = 0 OR o.delflag IS NULL)
          AND o.recordTime IS NOT NULL
        GROUP BY o.openId, o.vipId, o.id, o.vipTel
      `;
            const result = await cyrg2025Pool.request().query(customerQuery);
            logger_1.default.info(`查询到 ${result.recordset.length} 个客户记录`);
            // 批量插入或更新客户画像数据
            for (const record of result.recordset) {
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
                    customer_segment: this.calculateCustomerSegment(record.last_order_date, record.total_orders, record.total_spend)
                };
                await this.upsertCustomerProfile(hotdogPool, customerProfile);
            }
            await cyrg2025Pool.close();
            await hotdogPool.close();
            logger_1.default.info('客户基础数据同步完成');
        }
        catch (error) {
            logger_1.default.error('同步客户基础数据失败:', error);
            throw error;
        }
    }
    /**
     * 分析客户消费行为
     */
    async analyzeCustomerBehavior() {
        try {
            logger_1.default.info('开始分析客户消费行为...');
            const cyrg2025Pool = await mssql_1.default.connect(this.cyrg2025Config);
            const hotdogPool = await mssql_1.default.connect(this.hotdogConfig);
            // 显式切换到hotdog2030数据库
            await hotdogPool.request().query('USE hotdog2030');
            logger_1.default.info('切换到hotdog2030数据库');
            // 查询客户消费行为数据
            const behaviorQuery = `
        SELECT 
          COALESCE(o.openId, CONCAT('CUST_', o.id)) as customer_id,
          CAST(o.recordTime AS DATE) as analysis_date,
          COUNT(DISTINCT o.id) as order_count,
          SUM(CASE WHEN o.cash > 0 THEN o.cash ELSE o.total END) as total_amount,
          AVG(CASE WHEN o.cash > 0 THEN o.cash ELSE o.total END) as avg_order_amount,
          o.deliverType as preferred_channel,
          o.payType as preferred_payment_method
        FROM cyrg2025.dbo.Orders o
        WHERE (o.payState = 2 OR o.payState IS NULL)
          AND (o.delflag = 0 OR o.delflag IS NULL)
          AND o.recordTime IS NOT NULL
        GROUP BY o.openId, o.id, CAST(o.recordTime AS DATE), o.deliverType, o.payType
        ORDER BY analysis_date DESC
      `;
            const result = await cyrg2025Pool.request().query(behaviorQuery);
            logger_1.default.info(`查询到 ${result.recordset.length} 条消费行为记录`);
            // 批量插入消费行为数据
            for (const record of result.recordset) {
                const customerBehavior = {
                    customer_id: record.customer_id,
                    analysis_date: record.analysis_date,
                    order_count: record.order_count,
                    total_amount: record.total_amount || 0,
                    avg_order_amount: record.avg_order_amount || 0,
                    preferred_channel: record.preferred_channel,
                    preferred_payment_method: record.preferred_payment_method
                };
                await this.insertCustomerBehavior(hotdogPool, customerBehavior);
            }
            await cyrg2025Pool.close();
            await hotdogPool.close();
            logger_1.default.info('客户消费行为分析完成');
        }
        catch (error) {
            logger_1.default.error('分析客户消费行为失败:', error);
            throw error;
        }
    }
    /**
     * 分析客户商品偏好
     */
    async analyzeCustomerProductPreferences() {
        try {
            logger_1.default.info('开始分析客户商品偏好...');
            const cyrg2025Pool = await mssql_1.default.connect(this.cyrg2025Config);
            const hotdogPool = await mssql_1.default.connect(this.hotdogConfig);
            // 显式切换到hotdog2030数据库
            await hotdogPool.request().query('USE hotdog2030');
            logger_1.default.info('切换到hotdog2030数据库');
            // 查询客户商品偏好数据
            const preferenceQuery = `
        SELECT 
          COALESCE(o.openId, CONCAT('CUST_', o.id)) as customer_id,
          og.categoryId,
          c.catName as category_name,
          og.goodsId as product_id,
          g.goodsName as product_name,
          COUNT(*) as purchase_count,
          SUM(og.goodsNumber * og.goodsPrice) as total_amount,
          MAX(CAST(o.recordTime AS DATE)) as last_purchase_date
        FROM cyrg2025.dbo.Orders o
        INNER JOIN cyrg2025.dbo.OrderGoods og ON o.id = og.orderId
        LEFT JOIN cyrg2025.dbo.Category c ON og.categoryId = c.id
        LEFT JOIN cyrg2025.dbo.Goods g ON og.goodsId = g.id
        WHERE (o.payState = 2 OR o.payState IS NULL)
          AND (o.delflag = 0 OR o.delflag IS NULL)
          AND o.recordTime IS NOT NULL
        GROUP BY o.openId, o.id, og.categoryId, c.catName, og.goodsId, g.goodsName
        ORDER BY purchase_count DESC
      `;
            const result = await cyrg2025Pool.request().query(preferenceQuery);
            logger_1.default.info(`查询到 ${result.recordset.length} 条商品偏好记录`);
            // 批量插入商品偏好数据
            for (const record of result.recordset) {
                const customerProductPreference = {
                    customer_id: record.customer_id,
                    category_id: record.categoryId,
                    category_name: record.category_name,
                    product_id: record.product_id,
                    product_name: record.product_name,
                    purchase_count: record.purchase_count,
                    total_amount: record.total_amount || 0,
                    last_purchase_date: record.last_purchase_date,
                    preference_score: this.calculatePreferenceScore(record.purchase_count, record.total_amount)
                };
                await this.insertCustomerProductPreference(hotdogPool, customerProductPreference);
            }
            await cyrg2025Pool.close();
            await hotdogPool.close();
            logger_1.default.info('客户商品偏好分析完成');
        }
        catch (error) {
            logger_1.default.error('分析客户商品偏好失败:', error);
            throw error;
        }
    }
    /**
     * 分析客户时间模式
     */
    async analyzeCustomerTimePatterns() {
        try {
            logger_1.default.info('开始分析客户时间模式...');
            const cyrg2025Pool = await mssql_1.default.connect(this.cyrg2025Config);
            const hotdogPool = await mssql_1.default.connect(this.hotdogConfig);
            // 显式切换到hotdog2030数据库
            await hotdogPool.request().query('USE hotdog2030');
            logger_1.default.info('切换到hotdog2030数据库');
            // 查询客户购买时间数据
            const timeQuery = `
        SELECT 
          COALESCE(o.openId, CONCAT('CUST_', o.id)) as customer_id,
          CAST(o.recordTime AS DATE) as analysis_date,
          DATEPART(HOUR, o.recordTime) as hour_of_day,
          COUNT(DISTINCT o.id) as order_count,
          SUM(CASE WHEN o.cash > 0 THEN o.cash ELSE o.total END) as total_amount
        FROM cyrg2025.dbo.Orders o
        WHERE (o.payState = 2 OR o.payState IS NULL)
          AND (o.delflag = 0 OR o.delflag IS NULL)
          AND o.recordTime IS NOT NULL
        GROUP BY o.openId, o.id, CAST(o.recordTime AS DATE), DATEPART(HOUR, o.recordTime)
        ORDER BY analysis_date DESC, hour_of_day
      `;
            const result = await cyrg2025Pool.request().query(timeQuery);
            logger_1.default.info(`查询到 ${result.recordset.length} 条时间模式记录`);
            // 批量插入时间分析数据
            for (const record of result.recordset) {
                const customerTimeAnalysis = {
                    customer_id: record.customer_id,
                    analysis_date: record.analysis_date,
                    hour_of_day: record.hour_of_day,
                    order_count: record.order_count,
                    total_amount: record.total_amount || 0
                };
                await this.insertCustomerTimeAnalysis(hotdogPool, customerTimeAnalysis);
            }
            await cyrg2025Pool.close();
            await hotdogPool.close();
            logger_1.default.info('客户时间模式分析完成');
        }
        catch (error) {
            logger_1.default.error('分析客户时间模式失败:', error);
            throw error;
        }
    }
    /**
     * 计算RFM分数
     */
    calculateRFMScore(lastOrderDate, frequency, monetary) {
        const now = new Date();
        const recency = Math.floor((now.getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
        let rScore = 1;
        if (recency <= 30)
            rScore = 5;
        else if (recency <= 60)
            rScore = 4;
        else if (recency <= 90)
            rScore = 3;
        else if (recency <= 180)
            rScore = 2;
        let fScore = 1;
        if (frequency >= 10)
            fScore = 5;
        else if (frequency >= 5)
            fScore = 4;
        else if (frequency >= 3)
            fScore = 3;
        else if (frequency >= 2)
            fScore = 2;
        let mScore = 1;
        if (monetary >= 1000)
            mScore = 5;
        else if (monetary >= 500)
            mScore = 4;
        else if (monetary >= 200)
            mScore = 3;
        else if (monetary >= 100)
            mScore = 2;
        return `${rScore}${fScore}${mScore}`;
    }
    /**
     * 计算客户分层
     */
    calculateCustomerSegment(lastOrderDate, frequency, monetary) {
        const rfmScore = this.calculateRFMScore(lastOrderDate, frequency, monetary);
        const r = parseInt(rfmScore[0]);
        const f = parseInt(rfmScore[1]);
        const m = parseInt(rfmScore[2]);
        if (r >= 4 && f >= 4 && m >= 4)
            return '重要价值客户';
        if (r >= 4 && f >= 4 && m < 4)
            return '重要发展客户';
        if (r >= 4 && f < 4 && m >= 4)
            return '重要挽留客户';
        if (r < 4 && f >= 4 && m >= 4)
            return '一般价值客户';
        if (r >= 4 && f < 4 && m < 4)
            return '一般发展客户';
        if (r < 4 && f >= 4 && m < 4)
            return '一般挽留客户';
        if (r < 4 && f < 4 && m >= 4)
            return '低价值客户';
        return '低价值客户';
    }
    /**
     * 计算订单频率
     */
    calculateOrderFrequency(firstOrderDate, lastOrderDate, totalOrders) {
        if (!firstOrderDate || !lastOrderDate || totalOrders <= 1)
            return 0;
        const daysDiff = Math.floor((new Date(lastOrderDate).getTime() - new Date(firstOrderDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 0)
            return 0;
        return Math.round((totalOrders / daysDiff) * 30 * 100) / 100; // 每月订单数
    }
    /**
     * 计算年龄组
     */
    calculateAgeGroup(gender) {
        // 这里需要根据实际情况调整
        return '未知';
    }
    /**
     * 计算偏好分数
     */
    calculatePreferenceScore(purchaseCount, totalAmount) {
        return Math.round((purchaseCount * 0.6 + (totalAmount / 100) * 0.4) * 100) / 100;
    }
    /**
     * 插入或更新客户画像
     */
    async upsertCustomerProfile(pool, profile) {
        const query = `
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
          age_group = @age_group,
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
          updated_at = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (
          customer_id, open_id, vip_num, phone, nickname, gender, age_group,
          city, district, first_order_date, last_order_date, total_orders,
          total_spend, avg_order_amount, order_frequency, customer_lifetime_value,
          rfm_score, customer_segment, batch_time, created_at, updated_at
        )
        VALUES (
          @customer_id, @open_id, @vip_num, @phone, @nickname, @gender, @age_group,
          @city, @district, @first_order_date, @last_order_date, @total_orders,
          @total_spend, @avg_order_amount, @order_frequency, @customer_lifetime_value,
          @rfm_score, @customer_segment, GETDATE(), GETDATE(), GETDATE()
        );
    `;
        await pool.request()
            .input('customer_id', mssql_1.default.NVarChar, profile.customer_id)
            .input('open_id', mssql_1.default.NVarChar, profile.open_id)
            .input('vip_num', mssql_1.default.NVarChar, profile.vip_num)
            .input('phone', mssql_1.default.NVarChar, profile.phone)
            .input('nickname', mssql_1.default.NVarChar, profile.nickname)
            .input('gender', mssql_1.default.TinyInt, profile.gender)
            .input('age_group', mssql_1.default.VarChar, profile.age_group)
            .input('city', mssql_1.default.NVarChar, profile.city)
            .input('district', mssql_1.default.NVarChar, profile.district)
            .input('first_order_date', mssql_1.default.Date, profile.first_order_date)
            .input('last_order_date', mssql_1.default.Date, profile.last_order_date)
            .input('total_orders', mssql_1.default.Int, profile.total_orders)
            .input('total_spend', mssql_1.default.Decimal(12, 2), profile.total_spend)
            .input('avg_order_amount', mssql_1.default.Decimal(10, 2), profile.avg_order_amount)
            .input('order_frequency', mssql_1.default.Decimal(5, 2), profile.order_frequency)
            .input('customer_lifetime_value', mssql_1.default.Decimal(12, 2), profile.customer_lifetime_value)
            .input('rfm_score', mssql_1.default.VarChar, profile.rfm_score)
            .input('customer_segment', mssql_1.default.VarChar, profile.customer_segment)
            .query(query);
    }
    /**
     * 插入客户消费行为
     */
    async insertCustomerBehavior(pool, behavior) {
        const query = `
      INSERT INTO customer_behavior (
        customer_id, analysis_date, order_count, total_amount, avg_order_amount,
        preferred_time_slot, preferred_payment_method, preferred_channel, batch_time
      ) VALUES (
        @customer_id, @analysis_date, @order_count, @total_amount, @avg_order_amount,
        @preferred_time_slot, @preferred_payment_method, @preferred_channel, GETDATE()
      )
    `;
        await pool.request()
            .input('customer_id', mssql_1.default.NVarChar, behavior.customer_id)
            .input('analysis_date', mssql_1.default.Date, behavior.analysis_date)
            .input('order_count', mssql_1.default.Int, behavior.order_count)
            .input('total_amount', mssql_1.default.Decimal(10, 2), behavior.total_amount)
            .input('avg_order_amount', mssql_1.default.Decimal(10, 2), behavior.avg_order_amount)
            .input('preferred_time_slot', mssql_1.default.VarChar, behavior.preferred_time_slot)
            .input('preferred_payment_method', mssql_1.default.VarChar, behavior.preferred_payment_method)
            .input('preferred_channel', mssql_1.default.VarChar, behavior.preferred_channel)
            .query(query);
    }
    /**
     * 插入客户商品偏好
     */
    async insertCustomerProductPreference(pool, preference) {
        const query = `
      INSERT INTO customer_product_preferences (
        customer_id, category_id, category_name, product_id, product_name,
        purchase_count, total_amount, last_purchase_date, preference_score, batch_time
      ) VALUES (
        @customer_id, @category_id, @category_name, @product_id, @product_name,
        @purchase_count, @total_amount, @last_purchase_date, @preference_score, GETDATE()
      )
    `;
        await pool.request()
            .input('customer_id', mssql_1.default.NVarChar, preference.customer_id)
            .input('category_id', mssql_1.default.Int, preference.category_id)
            .input('category_name', mssql_1.default.NVarChar, preference.category_name)
            .input('product_id', mssql_1.default.Int, preference.product_id)
            .input('product_name', mssql_1.default.NVarChar, preference.product_name)
            .input('purchase_count', mssql_1.default.Int, preference.purchase_count)
            .input('total_amount', mssql_1.default.Decimal(10, 2), preference.total_amount)
            .input('last_purchase_date', mssql_1.default.Date, preference.last_purchase_date)
            .input('preference_score', mssql_1.default.Decimal(5, 2), preference.preference_score)
            .query(query);
    }
    /**
     * 插入客户时间分析
     */
    async insertCustomerTimeAnalysis(pool, timeAnalysis) {
        const query = `
      INSERT INTO customer_time_analysis (
        customer_id, analysis_date, hour_of_day, order_count, total_amount, batch_time
      ) VALUES (
        @customer_id, @analysis_date, @hour_of_day, @order_count, @total_amount, GETDATE()
      )
    `;
        await pool.request()
            .input('customer_id', mssql_1.default.NVarChar, timeAnalysis.customer_id)
            .input('analysis_date', mssql_1.default.Date, timeAnalysis.analysis_date)
            .input('hour_of_day', mssql_1.default.TinyInt, timeAnalysis.hour_of_day)
            .input('order_count', mssql_1.default.Int, timeAnalysis.order_count)
            .input('total_amount', mssql_1.default.Decimal(10, 2), timeAnalysis.total_amount)
            .query(query);
    }
    /**
     * 获取客群画像汇总数据
     */
    async getCustomerPortraitSummary(params) {
        try {
            const pool = await mssql_1.default.connect(this.hotdogConfig);
            // 显式切换到hotdog2030数据库
            await pool.request().query('USE hotdog2030');
            logger_1.default.info('切换到hotdog2030数据库');
            let whereClause = 'WHERE 1=1';
            const inputs = {};
            if (params.storeId) {
                whereClause += ' AND store_id = @storeId';
                inputs.storeId = params.storeId;
            }
            if (params.city) {
                whereClause += ' AND city = @city';
                inputs.city = params.city;
            }
            if (params.startDate) {
                whereClause += ' AND analysis_date >= @startDate';
                inputs.startDate = params.startDate;
            }
            if (params.endDate) {
                whereClause += ' AND analysis_date <= @endDate';
                inputs.endDate = params.endDate;
            }
            const query = `
        SELECT TOP 1 *
        FROM customer_portrait_summary
        ${whereClause}
        ORDER BY analysis_date DESC
      `;
            const request = pool.request();
            Object.keys(inputs).forEach(key => {
                request.input(key, inputs[key]);
            });
            const result = await request.query(query);
            await pool.close();
            return result.recordset[0] || null;
        }
        catch (error) {
            logger_1.default.error('获取客群画像汇总数据失败:', error);
            throw error;
        }
    }
    /**
     * 获取客户分层分布
     */
    async getCustomerSegmentDistribution(params) {
        try {
            const pool = await mssql_1.default.connect(this.hotdogConfig);
            // 显式切换到hotdog2030数据库
            await pool.request().query('USE hotdog2030');
            logger_1.default.info('切换到hotdog2030数据库');
            let whereClause = 'WHERE 1=1';
            const inputs = {};
            if (params.storeId) {
                whereClause += ' AND store_id = @storeId';
                inputs.storeId = params.storeId;
            }
            if (params.city) {
                whereClause += ' AND city = @city';
                inputs.city = params.city;
            }
            const query = `
        SELECT 
          customer_segment,
          COUNT(*) as customer_count,
          AVG(total_spend) as avg_spend,
          AVG(total_orders) as avg_orders
        FROM customer_profiles
        ${whereClause}
        GROUP BY customer_segment
        ORDER BY customer_count DESC
      `;
            const request = pool.request();
            Object.keys(inputs).forEach(key => {
                request.input(key, inputs[key]);
            });
            const result = await request.query(query);
            await pool.close();
            return result.recordset;
        }
        catch (error) {
            logger_1.default.error('获取客户分层分布失败:', error);
            throw error;
        }
    }
    /**
     * 获取客户购买时间分布
     */
    async getCustomerTimeDistribution(params) {
        try {
            const pool = await mssql_1.default.connect(this.hotdogConfig);
            // 显式切换到hotdog2030数据库
            await pool.request().query('USE hotdog2030');
            logger_1.default.info('切换到hotdog2030数据库');
            let whereClause = 'WHERE 1=1';
            const inputs = {};
            if (params.storeId) {
                whereClause += ' AND store_id = @storeId';
                inputs.storeId = params.storeId;
            }
            if (params.city) {
                whereClause += ' AND city = @city';
                inputs.city = params.city;
            }
            if (params.startDate) {
                whereClause += ' AND analysis_date >= @startDate';
                inputs.startDate = params.startDate;
            }
            if (params.endDate) {
                whereClause += ' AND analysis_date <= @endDate';
                inputs.endDate = params.endDate;
            }
            const query = `
        SELECT 
          hour_of_day,
          SUM(order_count) as total_orders,
          SUM(total_amount) as total_amount
        FROM customer_time_analysis
        ${whereClause}
        GROUP BY hour_of_day
        ORDER BY hour_of_day
      `;
            const request = pool.request();
            Object.keys(inputs).forEach(key => {
                request.input(key, inputs[key]);
            });
            const result = await request.query(query);
            await pool.close();
            return result.recordset;
        }
        catch (error) {
            logger_1.default.error('获取客户购买时间分布失败:', error);
            throw error;
        }
    }
    /**
     * 获取客户商品偏好
     */
    async getCustomerProductPreferences(params) {
        try {
            const pool = await mssql_1.default.connect(this.hotdogConfig);
            // 显式切换到hotdog2030数据库
            await pool.request().query('USE hotdog2030');
            logger_1.default.info('切换到hotdog2030数据库');
            let whereClause = 'WHERE 1=1';
            const inputs = {};
            if (params.storeId) {
                whereClause += ' AND store_id = @storeId';
                inputs.storeId = params.storeId;
            }
            if (params.city) {
                whereClause += ' AND city = @city';
                inputs.city = params.city;
            }
            const limit = params.limit || 10;
            const query = `
        SELECT TOP ${limit}
          category_name,
          product_name,
          SUM(purchase_count) as total_purchases,
          SUM(total_amount) as total_amount,
          AVG(preference_score) as avg_preference_score
        FROM customer_product_preferences
        ${whereClause}
        GROUP BY category_name, product_name
        ORDER BY total_purchases DESC
      `;
            const request = pool.request();
            Object.keys(inputs).forEach(key => {
                request.input(key, inputs[key]);
            });
            const result = await request.query(query);
            await pool.close();
            return result.recordset;
        }
        catch (error) {
            logger_1.default.error('获取客户商品偏好失败:', error);
            throw error;
        }
    }
    /**
     * 生成AI营销建议
     */
    async generateAIMarketingSuggestions(params) {
        try {
            const suggestions = [];
            // 获取客户分层数据
            const segmentDistribution = await this.getCustomerSegmentDistribution(params);
            // 为不同分层的客户生成建议
            for (const segment of segmentDistribution) {
                switch (segment.customer_segment) {
                    case '重要价值客户':
                        suggestions.push({
                            customer_id: undefined,
                            store_id: params.storeId,
                            city: params.city,
                            suggestion_type: 'VIP服务',
                            suggestion_title: '重要价值客户专属服务',
                            suggestion_content: `为${segment.customer_count}位重要价值客户提供专属VIP服务，包括优先新品体验、专属优惠券、生日礼遇等。`,
                            priority: 3,
                            expected_effect: '提高客户忠诚度，增加复购率'
                        });
                        break;
                    case '重要发展客户':
                        suggestions.push({
                            customer_id: undefined,
                            store_id: params.storeId,
                            city: params.city,
                            suggestion_type: '精准营销',
                            suggestion_title: '重要发展客户提升计划',
                            suggestion_content: `针对${segment.customer_count}位重要发展客户，通过个性化推荐和组合优惠，提升其消费频次和客单价。`,
                            priority: 2,
                            expected_effect: '提升客户价值，增加消费频次'
                        });
                        break;
                    case '重要挽留客户':
                        suggestions.push({
                            customer_id: undefined,
                            store_id: params.storeId,
                            city: params.city,
                            suggestion_type: '流失预警',
                            suggestion_title: '重要挽留客户召回计划',
                            suggestion_content: `对${segment.customer_count}位重要挽留客户实施召回计划，发送高价值优惠券和个性化关怀信息。`,
                            priority: 3,
                            expected_effect: '防止客户流失，恢复活跃度'
                        });
                        break;
                }
            }
            return suggestions;
        }
        catch (error) {
            logger_1.default.error('生成AI营销建议失败:', error);
            throw error;
        }
    }
}
exports.default = CustomerProfileService;
