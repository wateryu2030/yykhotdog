-- hotdog2030 数据库结构
-- 导出时间: 2025-10-20 15:42:16
-- 表数量: 16

-- 表: city
CREATE TABLE [city] (
    [id] int NOT NULL,
    [city_name] nvarchar(50),
    [province] nvarchar(50),
    [region] nvarchar(100),
    [created_at] datetime DEFAULT (getdate()),
    [updated_at] datetime DEFAULT (getdate()),
    [delflag] tinyint DEFAULT ((0)),
    PRIMARY KEY ([id])
);

-- 表: customers
CREATE TABLE [customers] (
    [id] int NOT NULL,
    [customer_id] nvarchar(100),
    [customer_name] nvarchar(100),
    [phone] nvarchar(50),
    [openid] nvarchar(100),
    [wechat_id] nvarchar(100),
    [alipay_id] nvarchar(100),
    [total_orders] int DEFAULT ((0)),
    [total_amount] decimal(18,2) DEFAULT ((0)),
    [last_order_date] datetime2,
    [created_at] datetime2,
    [updated_at] datetime2,
    [delflag] bit DEFAULT ((0)),
    [province] nvarchar(50),
    [city] nvarchar(50),
    [district] nvarchar(50),
    [country] nvarchar(50) DEFAULT ('??'),
    [language] nvarchar(20) DEFAULT ('??'),
    [is_active] bit DEFAULT ((1)),
    PRIMARY KEY ([id])
);

-- 表: dim_customer_segment
CREATE TABLE [dim_customer_segment] (
    [customer_id] nvarchar(100) NOT NULL,
    [r_score] tinyint NOT NULL,
    [f_score] tinyint NOT NULL,
    [m_score] tinyint NOT NULL,
    [segment_code] int NOT NULL,
    [updated_at] datetime2 DEFAULT (sysutcdatetime()),
    PRIMARY KEY ([customer_id])
);

-- 表: fact_alerts
CREATE TABLE [fact_alerts] (
    [alert_id] bigint NOT NULL,
    [date_key] int NOT NULL,
    [store_id] int,
    [city] nvarchar(100),
    [alert_type] nvarchar(50) NOT NULL,
    [severity] tinyint NOT NULL,
    [metric] nvarchar(50) NOT NULL,
    [current_val] decimal(18,2),
    [baseline_val] decimal(18,2),
    [delta_pct] decimal(9,4),
    [message] nvarchar(500),
    [created_at] datetime2 DEFAULT (sysutcdatetime()),
    PRIMARY KEY ([alert_id])
);

-- 表: fact_forecast_daily
CREATE TABLE [fact_forecast_daily] (
    [date_key] int NOT NULL,
    [store_id] int NOT NULL,
    [yhat] decimal(18,2) NOT NULL,
    [yhat_lower] decimal(18,2),
    [yhat_upper] decimal(18,2),
    [model_name] nvarchar(100),
    [created_at] datetime2 DEFAULT (sysutcdatetime()),
    PRIMARY KEY ([date_key], [store_id])
);

-- 表: fact_profit_daily
CREATE TABLE [fact_profit_daily] (
    [date_key] int NOT NULL,
    [store_id] int NOT NULL,
    [revenue] decimal(18,2) NOT NULL DEFAULT ((0)),
    [cogs] decimal(18,2) NOT NULL DEFAULT ((0)),
    [operating_exp] decimal(18,2) NOT NULL DEFAULT ((0)),
    [net_profit] decimal(20,2),
    PRIMARY KEY ([date_key], [store_id])
);

-- 表: fact_site_score
CREATE TABLE [fact_site_score] (
    [candidate_id] int NOT NULL,
    [city] nvarchar(100),
    [biz_area] nvarchar(200),
    [match_score] decimal(9,4) NOT NULL,
    [cannibal_score] decimal(9,4) NOT NULL,
    [total_score] decimal(9,4) NOT NULL,
    [rationale] nvarchar(1000),
    [created_at] datetime2 DEFAULT (sysutcdatetime()),
    PRIMARY KEY ([candidate_id])
);

-- 表: opening_pipeline
CREATE TABLE [opening_pipeline] (
    [id] int NOT NULL,
    [candidate_id] int NOT NULL,
    [city] nvarchar(100),
    [status] nvarchar(30) NOT NULL DEFAULT ('pending'),
    [expected_open_date] date,
    [owner] nvarchar(50),
    [note] nvarchar(500),
    [created_at] datetime2 DEFAULT (sysutcdatetime()),
    [updated_at] datetime2 DEFAULT (sysutcdatetime()),
    PRIMARY KEY ([id])
);

-- 表: opening_task
CREATE TABLE [opening_task] (
    [id] int NOT NULL,
    [pipeline_id] int NOT NULL,
    [task] nvarchar(100) NOT NULL,
    [status] nvarchar(20) NOT NULL DEFAULT ('todo'),
    [due_date] date,
    [assignee] nvarchar(50),
    [created_at] datetime2 DEFAULT (sysutcdatetime()),
    PRIMARY KEY ([id])
);

ALTER TABLE [opening_task] ADD CONSTRAINT FK_opening_task_pipeline_id FOREIGN KEY ([pipeline_id]) REFERENCES [opening_pipeline]([id]);

-- 表: operating_expense_import
CREATE TABLE [operating_expense_import] (
    [date_key] int NOT NULL,
    [store_id] int NOT NULL,
    [category] nvarchar(50) NOT NULL,
    [amount] decimal(18,2) NOT NULL,
    [note] nvarchar(200),
    [created_at] datetime2 DEFAULT (sysutcdatetime()),
    PRIMARY KEY ([date_key], [store_id], [category])
);

-- 表: order_items
CREATE TABLE [order_items] (
    [id] int NOT NULL,
    [order_id] int,
    [product_id] int,
    [product_name] nvarchar(200),
    [quantity] int,
    [price] decimal(18,2),
    [total_price] decimal(18,2),
    [created_at] datetime2,
    [updated_at] datetime2,
    [delflag] bit DEFAULT ((0)),
    PRIMARY KEY ([id])
);

-- 表: orders
CREATE TABLE [orders] (
    [id] int NOT NULL,
    [order_no] nvarchar(100),
    [store_id] int,
    [customer_id] nvarchar(100),
    [total_amount] decimal(18,2),
    [pay_state] int,
    [pay_mode] nvarchar(50),
    [created_at] datetime2,
    [updated_at] datetime2,
    [delflag] bit DEFAULT ((0)),
    [cash] decimal(10,2) DEFAULT ((0)),
    [vipAmount] decimal(10,2) DEFAULT ((0)),
    [vipAmountZengSong] decimal(10,2) DEFAULT ((0)),
    [cardAmount] decimal(10,2) DEFAULT ((0)),
    [cardZengSong] decimal(10,2) DEFAULT ((0)),
    [couponAmount] decimal(10,2) DEFAULT ((0)),
    [discountAmount] decimal(10,2) DEFAULT ((0)),
    [orderRemarks] nvarchar(500),
    PRIMARY KEY ([id])
);

-- 表: products
CREATE TABLE [products] (
    [id] int NOT NULL,
    [product_name] nvarchar(200),
    [category_id] int,
    [sale_price] decimal(18,2),
    [market_price] decimal(18,2),
    [cost_price] decimal(18,2),
    [goods_stock] int,
    [is_sale] bit,
    [is_hot] bit,
    [is_recommended] bit,
    [shop_id] int,
    [shop_name] nvarchar(200),
    [created_at] datetime2,
    [updated_at] datetime2,
    [delflag] bit DEFAULT ((0)),
    PRIMARY KEY ([id])
);

-- 表: region_hierarchy
CREATE TABLE [region_hierarchy] (
    [id] int NOT NULL,
    [name] nvarchar(100) NOT NULL,
    [parent_id] int,
    [level] int NOT NULL,
    [is_active] bit DEFAULT ((1)),
    [created_at] datetime DEFAULT (getdate()),
    [updated_at] datetime DEFAULT (getdate()),
    [code] nvarchar(20),
    [parent_code] nvarchar(20),
    [full_name] nvarchar(200),
    [sort_order] int,
    PRIMARY KEY ([id])
);

-- 表: review_stats_import
CREATE TABLE [review_stats_import] (
    [date_key] int NOT NULL,
    [store_id] int NOT NULL,
    [neg_count] int NOT NULL,
    [total_count] int,
    PRIMARY KEY ([date_key], [store_id])
);

-- 表: stores
CREATE TABLE [stores] (
    [id] int NOT NULL,
    [store_code] nvarchar(50),
    [store_name] nvarchar(200),
    [store_type] nvarchar(50),
    [status] nvarchar(50),
    [province] nvarchar(100),
    [city] nvarchar(100),
    [district] nvarchar(100),
    [address] nvarchar(500),
    [longitude] decimal(18,6),
    [latitude] decimal(18,6),
    [area_size] decimal(18,2),
    [rent_amount] decimal(18,2),
    [investment_amount] decimal(18,2),
    [expected_revenue] decimal(18,2),
    [director] nvarchar(100),
    [director_phone] nvarchar(50),
    [morning_time] nvarchar(50),
    [night_time] nvarchar(50),
    [passenger_flow] int,
    [is_self] bit,
    [is_close] bit,
    [created_at] datetime2,
    [updated_at] datetime2,
    [delflag] bit DEFAULT ((0)),
    PRIMARY KEY ([id])
);

