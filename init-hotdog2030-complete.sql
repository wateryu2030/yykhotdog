-- hotdog2030数据库完整初始化脚本
-- 基于cyrg2025和cyrgweixin数据库分析设计的完整表结构

USE [hotdog2030]
GO

-- =============================================
-- 1. 客户相关表
-- =============================================

-- 客户档案表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customer_profiles]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[customer_profiles] (
        [id] BIGINT IDENTITY(1,1) NOT NULL,
        [customer_id] NVARCHAR(100) NOT NULL, -- 客户ID，可以是open_id或其他标识
        [open_id] NVARCHAR(100), -- 微信open_id
        [vip_num] NVARCHAR(50), -- VIP号码
        [phone] NVARCHAR(20), -- 手机号
        [nickname] NVARCHAR(100), -- 昵称
        [gender] TINYINT, -- 性别 0-未知 1-男 2-女
        [age_group] NVARCHAR(20), -- 年龄段
        [city] NVARCHAR(50), -- 城市
        [district] NVARCHAR(50), -- 区域
        [first_order_date] DATE, -- 首次订单日期
        [last_order_date] DATE, -- 最后订单日期
        [total_orders] INT DEFAULT 0, -- 总订单数
        [total_spend] DECIMAL(12,2) DEFAULT 0, -- 总消费金额
        [avg_order_amount] DECIMAL(10,2) DEFAULT 0, -- 平均订单金额
        [order_frequency] DECIMAL(5,2) DEFAULT 0, -- 订单频率（次/月）
        [customer_lifetime_value] DECIMAL(12,2) DEFAULT 0, -- 客户生命周期价值
        [rfm_score] NVARCHAR(10), -- RFM评分
        [customer_segment] NVARCHAR(50), -- 客户分群
        [shop_name] NVARCHAR(100), -- 常去门店
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        [delflag] BIT DEFAULT 0,
        CONSTRAINT [PK_customer_profiles] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: customer_profiles'
END
GO

-- 客户行为分析表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customer_behavior_analysis]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[customer_behavior_analysis] (
        [id] BIGINT IDENTITY(1,1) NOT NULL,
        [customer_id] NVARCHAR(100) NOT NULL,
        [analysis_date] DATE NOT NULL,
        [order_count] INT DEFAULT 0, -- 订单数量
        [total_amount] DECIMAL(10,2) DEFAULT 0, -- 总金额
        [avg_order_amount] DECIMAL(10,2) DEFAULT 0, -- 平均订单金额
        [preferred_time_slot] NVARCHAR(20), -- 偏好时间段
        [preferred_payment_method] NVARCHAR(20), -- 偏好支付方式
        [preferred_channel] NVARCHAR(20), -- 偏好渠道
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        [delflag] BIT DEFAULT 0,
        CONSTRAINT [PK_customer_behavior_analysis] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: customer_behavior_analysis'
END
GO

-- 客户商品偏好表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customer_product_preferences]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[customer_product_preferences] (
        [id] BIGINT IDENTITY(1,1) NOT NULL,
        [customer_id] NVARCHAR(100) NOT NULL,
        [category_id] INT, -- 商品分类ID
        [category_name] NVARCHAR(100), -- 分类名称
        [product_id] INT, -- 商品ID
        [product_name] NVARCHAR(200), -- 商品名称
        [purchase_count] INT DEFAULT 0, -- 购买次数
        [total_amount] DECIMAL(10,2) DEFAULT 0, -- 总金额
        [last_purchase_date] DATE, -- 最后购买日期
        [preference_score] DECIMAL(5,2) DEFAULT 0, -- 偏好评分
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        [delflag] BIT DEFAULT 0,
        CONSTRAINT [PK_customer_product_preferences] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: customer_product_preferences'
END
GO

-- 客户时间分析表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customer_time_analysis]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[customer_time_analysis] (
        [id] BIGINT IDENTITY(1,1) NOT NULL,
        [customer_id] NVARCHAR(100) NOT NULL,
        [analysis_date] DATE NOT NULL,
        [hour_of_day] TINYINT NOT NULL, -- 小时 0-23
        [order_count] INT DEFAULT 0, -- 订单数量
        [total_amount] DECIMAL(10,2) DEFAULT 0, -- 总金额
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        [delflag] BIT DEFAULT 0,
        CONSTRAINT [PK_customer_time_analysis] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: customer_time_analysis'
END
GO

-- =============================================
-- 2. 门店相关表
-- =============================================

-- 门店信息表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[stores]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[stores] (
        [id] BIGINT IDENTITY(1,1) NOT NULL,
        [store_code] NVARCHAR(50) NOT NULL, -- 门店编码
        [store_name] NVARCHAR(100) NOT NULL, -- 门店名称
        [store_type] NVARCHAR(50) NOT NULL, -- 门店类型
        [status] NVARCHAR(50) NOT NULL, -- 状态
        [province] NVARCHAR(50) NOT NULL, -- 省份
        [city] NVARCHAR(50) NOT NULL, -- 城市
        [district] NVARCHAR(50) NOT NULL, -- 区域
        [address] NVARCHAR(200) NOT NULL, -- 地址
        [longitude] DECIMAL(10,7) NOT NULL, -- 经度
        [latitude] DECIMAL(10,7) NOT NULL, -- 纬度
        [area_size] DECIMAL(8,2), -- 面积
        [rent_amount] DECIMAL(10,2), -- 租金
        [investment_amount] DECIMAL(12,2), -- 投资金额
        [expected_revenue] DECIMAL(12,2), -- 预期收入
        [director] NVARCHAR(50), -- 店长
        [director_phone] NVARCHAR(20), -- 店长电话
        [morning_time] NVARCHAR(50), -- 营业时间-早上
        [night_time] NVARCHAR(50), -- 营业时间-晚上
        [passenger_flow] NVARCHAR(100), -- 客流量
        [establish_time] DATETIME2, -- 开业时间
        [opening_time] DATETIME2, -- 营业时间
        [is_self] BIT DEFAULT 0, -- 是否自营
        [is_close] BIT DEFAULT 0, -- 是否关闭
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        [delflag] BIT DEFAULT 0,
        CONSTRAINT [PK_stores] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: stores'
END
GO

-- 门店销售预测表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sales_predictions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[sales_predictions] (
        [id] BIGINT IDENTITY(1,1) NOT NULL,
        [store_id] BIGINT NOT NULL, -- 门店ID
        [date] DATE NOT NULL, -- 预测日期
        [hour] TINYINT NOT NULL, -- 小时 0-23
        [predicted_sales] DECIMAL(10,2) DEFAULT 0, -- 预测销售额
        [predicted_orders] INT DEFAULT 0, -- 预测订单数
        [confidence] DECIMAL(3,2) DEFAULT 0, -- 置信度
        [factors] NVARCHAR(MAX), -- 影响因素（JSON格式）
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        [delflag] BIT DEFAULT 0,
        CONSTRAINT [PK_sales_predictions] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: sales_predictions'
END
GO

-- 门店影响因素权重表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[store_factor_weights]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[store_factor_weights] (
        [id] BIGINT IDENTITY(1,1) NOT NULL,
        [store_id] BIGINT NOT NULL, -- 门店ID
        [factor_name] NVARCHAR(50) NOT NULL, -- 因素名称
        [weight] DECIMAL(5,4) NOT NULL, -- 权重
        [analysis_date] DATE NOT NULL, -- 分析日期
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        [delflag] BIT DEFAULT 0,
        CONSTRAINT [PK_store_factor_weights] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: store_factor_weights'
END
GO

-- =============================================
-- 3. 商品相关表
-- =============================================

-- 商品分类表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[categories]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[categories] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [category_name] NVARCHAR(100) NOT NULL, -- 分类名称
        [parent_id] INT, -- 父分类ID
        [sort_order] INT DEFAULT 0, -- 排序
        [is_active] BIT DEFAULT 1, -- 是否启用
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        [delflag] BIT DEFAULT 0,
        CONSTRAINT [PK_categories] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: categories'
END
GO

-- 商品信息表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[products] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [product_name] NVARCHAR(200) NOT NULL, -- 商品名称
        [category_id] INT, -- 分类ID
        [price] DECIMAL(10,2) NOT NULL, -- 价格
        [cost] DECIMAL(10,2), -- 成本
        [description] NVARCHAR(500), -- 描述
        [image_url] NVARCHAR(200), -- 图片URL
        [is_active] BIT DEFAULT 1, -- 是否启用
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        [delflag] BIT DEFAULT 0,
        CONSTRAINT [PK_products] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: products'
END
GO

-- =============================================
-- 4. 订单相关表
-- =============================================

-- 订单表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[orders]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[orders] (
        [id] BIGINT IDENTITY(1,1) NOT NULL,
        [order_no] NVARCHAR(50) NOT NULL, -- 订单号
        [customer_id] NVARCHAR(100), -- 客户ID
        [store_id] BIGINT, -- 门店ID
        [order_date] DATETIME2 NOT NULL, -- 订单日期
        [total_amount] DECIMAL(10,2) NOT NULL, -- 总金额
        [pay_state] TINYINT DEFAULT 0, -- 支付状态
        [order_state] TINYINT DEFAULT 0, -- 订单状态
        [payment_method] NVARCHAR(20), -- 支付方式
        [remark] NVARCHAR(500), -- 备注
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        [delflag] BIT DEFAULT 0,
        CONSTRAINT [PK_orders] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: orders'
END
GO

-- 订单商品表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[order_items]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[order_items] (
        [id] BIGINT IDENTITY(1,1) NOT NULL,
        [order_id] BIGINT NOT NULL, -- 订单ID
        [product_id] INT NOT NULL, -- 商品ID
        [quantity] INT NOT NULL, -- 数量
        [price] DECIMAL(10,2) NOT NULL, -- 单价
        [total_price] DECIMAL(10,2) NOT NULL, -- 总价
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        [delflag] BIT DEFAULT 0,
        CONSTRAINT [PK_order_items] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: order_items'
END
GO

-- =============================================
-- 5. 学校相关表（原有）
-- =============================================

-- 学校基础信息表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[school_basic_info]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[school_basic_info] (
        [id] BIGINT IDENTITY(1,1) NOT NULL,
        [school_name] NVARCHAR(200) NOT NULL,
        [school_type] NVARCHAR(50) NOT NULL, -- 小学、初中、高中、职业学校、大学、培训机构
        [province] NVARCHAR(50) NOT NULL,
        [city] NVARCHAR(50) NOT NULL,
        [district] NVARCHAR(50) NOT NULL,
        [address] NVARCHAR(500),
        [latitude] DECIMAL(10, 7), -- 纬度
        [longitude] DECIMAL(10, 7), -- 经度
        [student_count] INT, -- 学生人数
        [teacher_count] INT, -- 教师人数
        [established_year] INT, -- 建校年份
        [school_level] NVARCHAR(20), -- 学校等级：重点、普通等
        [contact_phone] NVARCHAR(20),
        [website] NVARCHAR(200),
        [description] NVARCHAR(1000),
        [is_active] BIT DEFAULT 1,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        [delflag] BIT DEFAULT 0,
        CONSTRAINT [PK_school_basic_info] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: school_basic_info'
END
GO

-- AI分析结果表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[school_ai_analysis]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[school_ai_analysis] (
        [id] BIGINT IDENTITY(1,1) NOT NULL,
        [school_id] BIGINT NOT NULL,
        [analysis_type] NVARCHAR(50) NOT NULL, -- 人数分析、位置分析、市场分析等
        [ai_model] NVARCHAR(100), -- 使用的AI模型
        [analysis_result] NVARCHAR(MAX), -- JSON格式的分析结果
        [confidence_score] DECIMAL(3,2), -- 置信度分数 0-1
        [analysis_date] DATETIME2 DEFAULT GETDATE(),
        [is_active] BIT DEFAULT 1,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        [delflag] BIT DEFAULT 0,
        CONSTRAINT [PK_school_ai_analysis] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: school_ai_analysis'
END
GO

-- 用户选择的学校表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[user_selected_schools]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[user_selected_schools] (
        [id] BIGINT IDENTITY(1,1) NOT NULL,
        [user_id] NVARCHAR(100), -- 用户ID，可以是open_id或其他标识
        [school_id] BIGINT NOT NULL,
        [selection_reason] NVARCHAR(500), -- 选择原因
        [priority_level] INT DEFAULT 1, -- 优先级 1-5
        [is_selected] BIT DEFAULT 1,
        [selected_at] DATETIME2 DEFAULT GETDATE(),
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        [delflag] BIT DEFAULT 0,
        CONSTRAINT [PK_user_selected_schools] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: user_selected_schools'
END
GO

-- 学校区域关联表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[school_region_mapping]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[school_region_mapping] (
        [id] BIGINT IDENTITY(1,1) NOT NULL,
        [school_id] BIGINT NOT NULL,
        [province_code] NVARCHAR(10),
        [city_code] NVARCHAR(10),
        [district_code] NVARCHAR(10),
        [region_name] NVARCHAR(100),
        [created_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT [PK_school_region_mapping] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: school_region_mapping'
END
GO

-- =============================================
-- 6. POI数据表
-- =============================================

-- POI数据表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[poi_data]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[poi_data] (
        [id] BIGINT IDENTITY(1,1) NOT NULL,
        [poi_name] NVARCHAR(100) NOT NULL,
        [poi_type] NVARCHAR(50) NOT NULL,
        [longitude] DECIMAL(10, 7) NOT NULL,
        [latitude] DECIMAL(10, 7) NOT NULL,
        [address] NVARCHAR(200) NOT NULL,
        [business_hours] NVARCHAR(100),
        [data_source] NVARCHAR(50),
        [created_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT [PK_poi_data] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '创建表: poi_data'
END
GO

-- =============================================
-- 7. 创建外键约束
-- =============================================

-- 客户行为分析表外键
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_customer_behavior_analysis_customer_profiles]') AND parent_object_id = OBJECT_ID(N'[dbo].[customer_behavior_analysis]'))
BEGIN
    ALTER TABLE [dbo].[customer_behavior_analysis] 
    ADD CONSTRAINT [FK_customer_behavior_analysis_customer_profiles] 
    FOREIGN KEY([customer_id]) REFERENCES [dbo].[customer_profiles] ([customer_id]);
    PRINT '创建外键: FK_customer_behavior_analysis_customer_profiles'
END
GO

-- 客户商品偏好表外键
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_customer_product_preferences_customer_profiles]') AND parent_object_id = OBJECT_ID(N'[dbo].[customer_product_preferences]'))
BEGIN
    ALTER TABLE [dbo].[customer_product_preferences] 
    ADD CONSTRAINT [FK_customer_product_preferences_customer_profiles] 
    FOREIGN KEY([customer_id]) REFERENCES [dbo].[customer_profiles] ([customer_id]);
    PRINT '创建外键: FK_customer_product_preferences_customer_profiles'
END
GO

-- 客户时间分析表外键
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_customer_time_analysis_customer_profiles]') AND parent_object_id = OBJECT_ID(N'[dbo].[customer_time_analysis]'))
BEGIN
    ALTER TABLE [dbo].[customer_time_analysis] 
    ADD CONSTRAINT [FK_customer_time_analysis_customer_profiles] 
    FOREIGN KEY([customer_id]) REFERENCES [dbo].[customer_profiles] ([customer_id]);
    PRINT '创建外键: FK_customer_time_analysis_customer_profiles'
END
GO

-- 门店销售预测表外键
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_sales_predictions_stores]') AND parent_object_id = OBJECT_ID(N'[dbo].[sales_predictions]'))
BEGIN
    ALTER TABLE [dbo].[sales_predictions] 
    ADD CONSTRAINT [FK_sales_predictions_stores] 
    FOREIGN KEY([store_id]) REFERENCES [dbo].[stores] ([id]);
    PRINT '创建外键: FK_sales_predictions_stores'
END
GO

-- 门店影响因素权重表外键
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_store_factor_weights_stores]') AND parent_object_id = OBJECT_ID(N'[dbo].[store_factor_weights]'))
BEGIN
    ALTER TABLE [dbo].[store_factor_weights] 
    ADD CONSTRAINT [FK_store_factor_weights_stores] 
    FOREIGN KEY([store_id]) REFERENCES [dbo].[stores] ([id]);
    PRINT '创建外键: FK_store_factor_weights_stores'
END
GO

-- 商品表外键
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_products_categories]') AND parent_object_id = OBJECT_ID(N'[dbo].[products]'))
BEGIN
    ALTER TABLE [dbo].[products] 
    ADD CONSTRAINT [FK_products_categories] 
    FOREIGN KEY([category_id]) REFERENCES [dbo].[categories] ([id]);
    PRINT '创建外键: FK_products_categories'
END
GO

-- 订单表外键
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_orders_customer_profiles]') AND parent_object_id = OBJECT_ID(N'[dbo].[orders]'))
BEGIN
    ALTER TABLE [dbo].[orders] 
    ADD CONSTRAINT [FK_orders_customer_profiles] 
    FOREIGN KEY([customer_id]) REFERENCES [dbo].[customer_profiles] ([customer_id]);
    PRINT '创建外键: FK_orders_customer_profiles'
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_orders_stores]') AND parent_object_id = OBJECT_ID(N'[dbo].[orders]'))
BEGIN
    ALTER TABLE [dbo].[orders] 
    ADD CONSTRAINT [FK_orders_stores] 
    FOREIGN KEY([store_id]) REFERENCES [dbo].[stores] ([id]);
    PRINT '创建外键: FK_orders_stores'
END
GO

-- 订单商品表外键
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_order_items_orders]') AND parent_object_id = OBJECT_ID(N'[dbo].[order_items]'))
BEGIN
    ALTER TABLE [dbo].[order_items] 
    ADD CONSTRAINT [FK_order_items_orders] 
    FOREIGN KEY([order_id]) REFERENCES [dbo].[orders] ([id]);
    PRINT '创建外键: FK_order_items_orders'
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_order_items_products]') AND parent_object_id = OBJECT_ID(N'[dbo].[order_items]'))
BEGIN
    ALTER TABLE [dbo].[order_items] 
    ADD CONSTRAINT [FK_order_items_products] 
    FOREIGN KEY([product_id]) REFERENCES [dbo].[products] ([id]);
    PRINT '创建外键: FK_order_items_products'
END
GO

-- 学校相关表外键
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_school_ai_analysis_school_basic_info]') AND parent_object_id = OBJECT_ID(N'[dbo].[school_ai_analysis]'))
BEGIN
    ALTER TABLE [dbo].[school_ai_analysis] 
    ADD CONSTRAINT [FK_school_ai_analysis_school_basic_info] 
    FOREIGN KEY([school_id]) REFERENCES [dbo].[school_basic_info] ([id]);
    PRINT '创建外键: FK_school_ai_analysis_school_basic_info'
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_user_selected_schools_school_basic_info]') AND parent_object_id = OBJECT_ID(N'[dbo].[user_selected_schools]'))
BEGIN
    ALTER TABLE [dbo].[user_selected_schools] 
    ADD CONSTRAINT [FK_user_selected_schools_school_basic_info] 
    FOREIGN KEY([school_id]) REFERENCES [dbo].[school_basic_info] ([id]);
    PRINT '创建外键: FK_user_selected_schools_school_basic_info'
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_school_region_mapping_school_basic_info]') AND parent_object_id = OBJECT_ID(N'[dbo].[school_region_mapping]'))
BEGIN
    ALTER TABLE [dbo].[school_region_mapping] 
    ADD CONSTRAINT [FK_school_region_mapping_school_basic_info] 
    FOREIGN KEY([school_id]) REFERENCES [dbo].[school_basic_info] ([id]);
    PRINT '创建外键: FK_school_region_mapping_school_basic_info'
END
GO

-- =============================================
-- 8. 创建索引
-- =============================================

-- 客户档案表索引
CREATE NONCLUSTERED INDEX [IX_customer_profiles_customer_id] ON [dbo].[customer_profiles] ([customer_id]);
CREATE NONCLUSTERED INDEX [IX_customer_profiles_phone] ON [dbo].[customer_profiles] ([phone]);
CREATE NONCLUSTERED INDEX [IX_customer_profiles_city] ON [dbo].[customer_profiles] ([city]);
CREATE NONCLUSTERED INDEX [IX_customer_profiles_last_order_date] ON [dbo].[customer_profiles] ([last_order_date]);

-- 门店表索引
CREATE NONCLUSTERED INDEX [IX_stores_city] ON [dbo].[stores] ([city]);
CREATE NONCLUSTERED INDEX [IX_stores_coordinates] ON [dbo].[stores] ([longitude], [latitude]);
CREATE NONCLUSTERED INDEX [IX_stores_status] ON [dbo].[stores] ([status]);

-- 订单表索引
CREATE NONCLUSTERED INDEX [IX_orders_customer_id] ON [dbo].[orders] ([customer_id]);
CREATE NONCLUSTERED INDEX [IX_orders_store_id] ON [dbo].[orders] ([store_id]);
CREATE NONCLUSTERED INDEX [IX_orders_order_date] ON [dbo].[orders] ([order_date]);

-- 学校表索引
CREATE NONCLUSTERED INDEX [IX_school_basic_info_region] ON [dbo].[school_basic_info] ([province], [city], [district]);
CREATE NONCLUSTERED INDEX [IX_school_basic_info_type] ON [dbo].[school_basic_info] ([school_type]);
CREATE NONCLUSTERED INDEX [IX_school_basic_info_student_count] ON [dbo].[school_basic_info] ([student_count]);

-- POI数据表索引
CREATE NONCLUSTERED INDEX [IX_poi_data_type] ON [dbo].[poi_data] ([poi_type]);
CREATE NONCLUSTERED INDEX [IX_poi_data_coordinates] ON [dbo].[poi_data] ([longitude], [latitude]);

PRINT '创建索引完成'

-- =============================================
-- 9. 添加表注释
-- =============================================

EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'客户档案表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'customer_profiles';
EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'客户行为分析表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'customer_behavior_analysis';
EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'客户商品偏好表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'customer_product_preferences';
EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'客户时间分析表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'customer_time_analysis';
EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'门店信息表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'stores';
EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'门店销售预测表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'sales_predictions';
EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'门店影响因素权重表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'store_factor_weights';
EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'商品分类表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'categories';
EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'商品信息表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'products';
EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'订单表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'orders';
EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'订单商品表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'order_items';
EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'学校基础信息表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'school_basic_info';
EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'AI分析结果表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'school_ai_analysis';
EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'用户选择的学校表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'user_selected_schools';
EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'学校区域关联表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'school_region_mapping';
EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'POI数据表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'poi_data';

PRINT 'hotdog2030数据库完整初始化完成！'
PRINT '已创建以下表:'
PRINT '- 客户相关: customer_profiles, customer_behavior_analysis, customer_product_preferences, customer_time_analysis'
PRINT '- 门店相关: stores, sales_predictions, store_factor_weights'
PRINT '- 商品相关: categories, products'
PRINT '- 订单相关: orders, order_items'
PRINT '- 学校相关: school_basic_info, school_ai_analysis, user_selected_schools, school_region_mapping'
PRINT '- 其他: poi_data'
