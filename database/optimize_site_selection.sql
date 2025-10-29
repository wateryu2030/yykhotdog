-- 智能化选址功能数据库优化脚本
-- 创建时间: 2025-01-28
-- 描述: 优化site_selections表结构和索引，支持增强版选址分析

-- ==================== 1. 添加新字段 ====================

-- 添加机器学习预测相关字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'ml_prediction_score')
BEGIN
    ALTER TABLE site_selections ADD ml_prediction_score DECIMAL(5,2) NULL;
    PRINT '已添加 ml_prediction_score 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'predicted_revenue')
BEGIN
    ALTER TABLE site_selections ADD predicted_revenue DECIMAL(12,2) NULL;
    PRINT '已添加 predicted_revenue 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'predicted_orders')
BEGIN
    ALTER TABLE site_selections ADD predicted_orders INT NULL;
    PRINT '已添加 predicted_orders 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'predicted_customers')
BEGIN
    ALTER TABLE site_selections ADD predicted_customers INT NULL;
    PRINT '已添加 predicted_customers 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'confidence_score')
BEGIN
    ALTER TABLE site_selections ADD confidence_score DECIMAL(5,2) NULL;
    PRINT '已添加 confidence_score 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'risk_level')
BEGIN
    ALTER TABLE site_selections ADD risk_level VARCHAR(20) NULL;
    PRINT '已添加 risk_level 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'success_probability')
BEGIN
    ALTER TABLE site_selections ADD success_probability DECIMAL(5,2) NULL;
    PRINT '已添加 success_probability 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'break_even_time')
BEGIN
    ALTER TABLE site_selections ADD break_even_time INT NULL;
    PRINT '已添加 break_even_time 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'roi_prediction')
BEGIN
    ALTER TABLE site_selections ADD roi_prediction DECIMAL(5,2) NULL;
    PRINT '已添加 roi_prediction 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'market_potential')
BEGIN
    ALTER TABLE site_selections ADD market_potential VARCHAR(20) NULL;
    PRINT '已添加 market_potential 字段';
END

-- 添加详细评分字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'foot_traffic_score')
BEGIN
    ALTER TABLE site_selections ADD foot_traffic_score DECIMAL(5,2) NULL;
    PRINT '已添加 foot_traffic_score 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'rental_cost_score')
BEGIN
    ALTER TABLE site_selections ADD rental_cost_score DECIMAL(5,2) NULL;
    PRINT '已添加 rental_cost_score 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'school_density_score')
BEGIN
    ALTER TABLE site_selections ADD school_density_score DECIMAL(5,2) NULL;
    PRINT '已添加 school_density_score 字段';
END

-- 添加分析结果字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'analysis_summary')
BEGIN
    ALTER TABLE site_selections ADD analysis_summary TEXT NULL;
    PRINT '已添加 analysis_summary 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'strengths')
BEGIN
    ALTER TABLE site_selections ADD strengths TEXT NULL;
    PRINT '已添加 strengths 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'weaknesses')
BEGIN
    ALTER TABLE site_selections ADD weaknesses TEXT NULL;
    PRINT '已添加 weaknesses 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'recommendations')
BEGIN
    ALTER TABLE site_selections ADD recommendations TEXT NULL;
    PRINT '已添加 recommendations 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'risk_factors')
BEGIN
    ALTER TABLE site_selections ADD risk_factors TEXT NULL;
    PRINT '已添加 risk_factors 字段';
END

-- 添加季节性趋势字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'spring_trend')
BEGIN
    ALTER TABLE site_selections ADD spring_trend DECIMAL(5,2) NULL;
    PRINT '已添加 spring_trend 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'summer_trend')
BEGIN
    ALTER TABLE site_selections ADD summer_trend DECIMAL(5,2) NULL;
    PRINT '已添加 summer_trend 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'autumn_trend')
BEGIN
    ALTER TABLE site_selections ADD autumn_trend DECIMAL(5,2) NULL;
    PRINT '已添加 autumn_trend 字段';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('site_selections') AND name = 'winter_trend')
BEGIN
    ALTER TABLE site_selections ADD winter_trend DECIMAL(5,2) NULL;
    PRINT '已添加 winter_trend 字段';
END

-- ==================== 2. 创建索引 ====================

-- 创建位置相关索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('site_selections') AND name = 'IX_site_selections_location')
BEGIN
    CREATE INDEX IX_site_selections_location ON site_selections (city, district);
    PRINT '已创建位置索引 IX_site_selections_location';
END

-- 创建评分相关索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('site_selections') AND name = 'IX_site_selections_score')
BEGIN
    CREATE INDEX IX_site_selections_score ON site_selections (score DESC);
    PRINT '已创建评分索引 IX_site_selections_score';
END

-- 创建机器学习预测索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('site_selections') AND name = 'IX_site_selections_ml_prediction')
BEGIN
    CREATE INDEX IX_site_selections_ml_prediction ON site_selections (ml_prediction_score DESC, confidence_score DESC);
    PRINT '已创建机器学习预测索引 IX_site_selections_ml_prediction';
END

-- 创建风险等级索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('site_selections') AND name = 'IX_site_selections_risk_level')
BEGIN
    CREATE INDEX IX_site_selections_risk_level ON site_selections (risk_level, success_probability DESC);
    PRINT '已创建风险等级索引 IX_site_selections_risk_level';
END

-- 创建时间索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('site_selections') AND name = 'IX_site_selections_created_at')
BEGIN
    CREATE INDEX IX_site_selections_created_at ON site_selections (created_at DESC);
    PRINT '已创建时间索引 IX_site_selections_created_at';
END

-- 创建复合索引（城市+评分）
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('site_selections') AND name = 'IX_site_selections_city_score')
BEGIN
    CREATE INDEX IX_site_selections_city_score ON site_selections (city, score DESC);
    PRINT '已创建复合索引 IX_site_selections_city_score';
END

-- ==================== 3. 创建视图 ====================

-- 创建选址分析概览视图
IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID('vw_site_selection_overview'))
BEGIN
    DROP VIEW vw_site_selection_overview;
END

CREATE VIEW vw_site_selection_overview AS
SELECT 
    id,
    location_name,
    province,
    city,
    district,
    address,
    longitude,
    latitude,
    score,
    ml_prediction_score,
    predicted_revenue,
    predicted_orders,
    predicted_customers,
    confidence_score,
    risk_level,
    success_probability,
    break_even_time,
    roi_prediction,
    market_potential,
    -- 评分详情
    poi_density_score,
    traffic_score,
    population_score,
    competition_score,
    foot_traffic_score,
    rental_cost_score,
    school_density_score,
    -- 状态和时间
    status,
    created_at,
    updated_at,
    -- 计算字段
    CASE 
        WHEN score >= 80 THEN '优秀'
        WHEN score >= 60 THEN '良好'
        WHEN score >= 40 THEN '一般'
        ELSE '较差'
    END as score_grade,
    CASE 
        WHEN risk_level = 'low' THEN 1
        WHEN risk_level = 'medium' THEN 2
        WHEN risk_level = 'high' THEN 3
        ELSE 0
    END as risk_level_order,
    CASE 
        WHEN market_potential = 'high' THEN 1
        WHEN market_potential = 'medium' THEN 2
        WHEN market_potential = 'low' THEN 3
        ELSE 0
    END as market_potential_order
FROM site_selections;

PRINT '已创建选址分析概览视图 vw_site_selection_overview';

-- 创建城市选址统计视图
IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID('vw_city_site_selection_stats'))
BEGIN
    DROP VIEW vw_city_site_selection_stats;
END

CREATE VIEW vw_city_site_selection_stats AS
SELECT 
    city,
    province,
    COUNT(*) as total_analyses,
    AVG(score) as avg_score,
    MIN(score) as min_score,
    MAX(score) as max_score,
    AVG(ml_prediction_score) as avg_ml_score,
    AVG(predicted_revenue) as avg_predicted_revenue,
    AVG(confidence_score) as avg_confidence,
    COUNT(CASE WHEN score >= 80 THEN 1 END) as excellent_count,
    COUNT(CASE WHEN score >= 60 AND score < 80 THEN 1 END) as good_count,
    COUNT(CASE WHEN score < 60 THEN 1 END) as poor_count,
    COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_risk_count,
    COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_risk_count,
    COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk_count,
    COUNT(CASE WHEN market_potential = 'high' THEN 1 END) as high_potential_count,
    COUNT(CASE WHEN market_potential = 'medium' THEN 1 END) as medium_potential_count,
    COUNT(CASE WHEN market_potential = 'low' THEN 1 END) as low_potential_count,
    MAX(created_at) as last_analysis_date
FROM site_selections
GROUP BY city, province;

PRINT '已创建城市选址统计视图 vw_city_site_selection_stats';

-- ==================== 4. 创建存储过程 ====================

-- 创建获取选址分析详情的存储过程
IF EXISTS (SELECT * FROM sys.procedures WHERE object_id = OBJECT_ID('sp_get_site_selection_details'))
BEGIN
    DROP PROCEDURE sp_get_site_selection_details;
END

CREATE PROCEDURE sp_get_site_selection_details
    @id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        s.*,
        c.city_avg_revenue,
        c.city_avg_orders,
        c.city_avg_customers
    FROM site_selections s
    LEFT JOIN vw_city_site_selection_stats c ON s.city = c.city
    WHERE s.id = @id;
END

PRINT '已创建存储过程 sp_get_site_selection_details';

-- 创建获取城市选址推荐的存储过程
IF EXISTS (SELECT * FROM sys.procedures WHERE object_id = OBJECT_ID('sp_get_city_recommendations'))
BEGIN
    DROP PROCEDURE sp_get_city_recommendations;
END

CREATE PROCEDURE sp_get_city_recommendations
    @city VARCHAR(50),
    @limit INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (@limit)
        id,
        location_name,
        district,
        address,
        score,
        ml_prediction_score,
        predicted_revenue,
        confidence_score,
        risk_level,
        success_probability,
        market_potential,
        created_at
    FROM site_selections
    WHERE city = @city
    ORDER BY 
        CASE WHEN ml_prediction_score IS NOT NULL THEN ml_prediction_score ELSE score END DESC,
        confidence_score DESC;
END

PRINT '已创建存储过程 sp_get_city_recommendations';

-- ==================== 5. 创建触发器 ====================

-- 创建自动更新updated_at的触发器
IF EXISTS (SELECT * FROM sys.triggers WHERE object_id = OBJECT_ID('tr_site_selections_update'))
BEGIN
    DROP TRIGGER tr_site_selections_update;
END

CREATE TRIGGER tr_site_selections_update
ON site_selections
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE site_selections
    SET updated_at = GETDATE()
    FROM site_selections s
    INNER JOIN inserted i ON s.id = i.id;
END

PRINT '已创建触发器 tr_site_selections_update';

-- ==================== 6. 数据清理和优化 ====================

-- 清理无效数据
UPDATE site_selections 
SET status = 'invalid'
WHERE longitude IS NULL 
   OR latitude IS NULL 
   OR score IS NULL 
   OR score < 0 
   OR score > 100;

PRINT '已清理无效数据';

-- 更新现有记录的默认值
UPDATE site_selections 
SET risk_level = CASE 
    WHEN score >= 80 THEN 'low'
    WHEN score >= 60 THEN 'medium'
    ELSE 'high'
END
WHERE risk_level IS NULL;

UPDATE site_selections 
SET market_potential = CASE 
    WHEN score >= 80 THEN 'high'
    WHEN score >= 60 THEN 'medium'
    ELSE 'low'
END
WHERE market_potential IS NULL;

PRINT '已更新现有记录的默认值';

-- ==================== 7. 创建统计表 ====================

-- 创建选址分析统计表
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('site_selection_statistics'))
BEGIN
    CREATE TABLE site_selection_statistics (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        stat_date DATE NOT NULL,
        total_analyses INT NOT NULL DEFAULT 0,
        avg_score DECIMAL(5,2) NULL,
        avg_ml_score DECIMAL(5,2) NULL,
        avg_predicted_revenue DECIMAL(12,2) NULL,
        avg_confidence DECIMAL(5,2) NULL,
        excellent_count INT NOT NULL DEFAULT 0,
        good_count INT NOT NULL DEFAULT 0,
        poor_count INT NOT NULL DEFAULT 0,
        low_risk_count INT NOT NULL DEFAULT 0,
        medium_risk_count INT NOT NULL DEFAULT 0,
        high_risk_count INT NOT NULL DEFAULT 0,
        high_potential_count INT NOT NULL DEFAULT 0,
        medium_potential_count INT NOT NULL DEFAULT 0,
        low_potential_count INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    
    CREATE INDEX IX_site_selection_statistics_date ON site_selection_statistics (stat_date DESC);
    
    PRINT '已创建选址分析统计表 site_selection_statistics';
END

-- ==================== 8. 创建作业（可选） ====================

-- 创建每日统计更新作业的存储过程
IF EXISTS (SELECT * FROM sys.procedures WHERE object_id = OBJECT_ID('sp_update_daily_statistics'))
BEGIN
    DROP PROCEDURE sp_update_daily_statistics;
END

CREATE PROCEDURE sp_update_daily_statistics
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @today DATE = CAST(GETDATE() AS DATE);
    
    -- 检查今日统计是否已存在
    IF NOT EXISTS (SELECT 1 FROM site_selection_statistics WHERE stat_date = @today)
    BEGIN
        INSERT INTO site_selection_statistics (
            stat_date,
            total_analyses,
            avg_score,
            avg_ml_score,
            avg_predicted_revenue,
            avg_confidence,
            excellent_count,
            good_count,
            poor_count,
            low_risk_count,
            medium_risk_count,
            high_risk_count,
            high_potential_count,
            medium_potential_count,
            low_potential_count
        )
        SELECT 
            @today,
            COUNT(*),
            AVG(score),
            AVG(ml_prediction_score),
            AVG(predicted_revenue),
            AVG(confidence_score),
            COUNT(CASE WHEN score >= 80 THEN 1 END),
            COUNT(CASE WHEN score >= 60 AND score < 80 THEN 1 END),
            COUNT(CASE WHEN score < 60 THEN 1 END),
            COUNT(CASE WHEN risk_level = 'low' THEN 1 END),
            COUNT(CASE WHEN risk_level = 'medium' THEN 1 END),
            COUNT(CASE WHEN risk_level = 'high' THEN 1 END),
            COUNT(CASE WHEN market_potential = 'high' THEN 1 END),
            COUNT(CASE WHEN market_potential = 'medium' THEN 1 END),
            COUNT(CASE WHEN market_potential = 'low' THEN 1 END)
        FROM site_selections
        WHERE CAST(created_at AS DATE) = @today;
        
        PRINT '已更新今日统计: ' + CAST(@today AS VARCHAR(10));
    END
    ELSE
    BEGIN
        PRINT '今日统计已存在: ' + CAST(@today AS VARCHAR(10));
    END
END

PRINT '已创建存储过程 sp_update_daily_statistics';

-- ==================== 完成 ====================

PRINT '========================================';
PRINT '智能化选址功能数据库优化完成！';
PRINT '========================================';
PRINT '新增功能:';
PRINT '1. 机器学习预测字段';
PRINT '2. 详细评分字段';
PRINT '3. 分析结果字段';
PRINT '4. 季节性趋势字段';
PRINT '5. 优化索引';
PRINT '6. 分析视图';
PRINT '7. 统计存储过程';
PRINT '8. 自动更新触发器';
PRINT '9. 统计表';
PRINT '========================================';
