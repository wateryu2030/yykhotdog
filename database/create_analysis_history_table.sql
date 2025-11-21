-- 创建铺位分析历史表
-- 支持对同一铺位进行多次分析，并保存历史记录

USE hotdog2030;
GO

-- ========================================
-- 创建铺位分析历史表
-- ========================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'candidate_analysis_history')
BEGIN
    CREATE TABLE candidate_analysis_history (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        candidate_id BIGINT NOT NULL,
        
        -- AI分析结果
        analysis_score DECIMAL(5,2),
        description NVARCHAR(MAX), -- AI生成的完整分析报告
        
        -- 使用的AI模型
        ai_model NVARCHAR(50), -- 使用的AI模型名称（如：gpt-4o-mini, doubao, gemini等）
        analysis_type NVARCHAR(50) DEFAULT 'comprehensive', -- 分析类型：comprehensive（综合分析）
        
        -- 分析配置（用于追溯）
        product_type NVARCHAR(255), -- 产品类型
        target_customers NVARCHAR(500), -- 目标客户定位
        
        -- 分析时间戳
        analyzed_at DATETIME2 DEFAULT GETDATE(),
        created_at DATETIME2 DEFAULT GETDATE(),
        
        -- 软删除
        delflag BIT DEFAULT 0,
        
        -- 索引
        INDEX IX_candidate_analysis_history_candidate (candidate_id),
        INDEX IX_candidate_analysis_history_time (analyzed_at),
        INDEX IX_candidate_analysis_history_score (analysis_score)
    );
    PRINT '✅ candidate_analysis_history 表创建成功';
END
ELSE
BEGIN
    PRINT 'ℹ️ candidate_analysis_history 表已存在';
END

-- ========================================
-- 添加外键约束（可选）
-- ========================================
-- 如果需要外键约束，取消下面的注释
-- IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_candidate_analysis_history_candidate')
-- BEGIN
--     ALTER TABLE candidate_analysis_history
--     ADD CONSTRAINT FK_candidate_analysis_history_candidate
--     FOREIGN KEY (candidate_id) REFERENCES candidate_locations(id) ON DELETE CASCADE;
--     PRINT '✅ 外键约束创建成功';
-- END

-- ========================================
-- 创建触发器：更新candidate_locations的最新分析结果
-- ========================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_candidate_analysis_history_update')
    DROP TRIGGER tr_candidate_analysis_history_update;
GO

CREATE TRIGGER tr_candidate_analysis_history_update
ON candidate_analysis_history
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 更新candidate_locations表的最新分析结果
    UPDATE cl
    SET 
        cl.analysis_score = h.analysis_score,
        cl.description = h.description,
        cl.status = 'analyzed',
        cl.updated_at = GETDATE()
    FROM candidate_locations cl
    INNER JOIN inserted i ON cl.id = i.candidate_id
    INNER JOIN (
        SELECT 
            candidate_id,
            analysis_score,
            description,
            ROW_NUMBER() OVER (PARTITION BY candidate_id ORDER BY analyzed_at DESC) as rn
        FROM candidate_analysis_history
        WHERE delflag = 0
    ) h ON h.candidate_id = i.candidate_id AND h.rn = 1;
END;
GO

PRINT '✅ 触发器创建成功';

PRINT '';
PRINT '🎉 铺位分析历史表创建完成！';
PRINT '';

GO

