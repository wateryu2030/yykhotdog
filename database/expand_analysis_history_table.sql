-- 扩展铺位分析历史表
-- 添加字段以支持保存完整的AI分析数据，包括原始响应、提示词、结构化数据等
-- 用于后续迭代分析和优化

USE hotdog2030;
GO

-- ========================================
-- 检查并添加新字段
-- ========================================

-- 保存原始AI响应
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('candidate_analysis_history') AND name = 'raw_ai_response')
BEGIN
    ALTER TABLE candidate_analysis_history
    ADD raw_ai_response NVARCHAR(MAX);
    PRINT '✅ 添加 raw_ai_response 字段成功';
END
ELSE
BEGIN
    PRINT 'ℹ️ raw_ai_response 字段已存在';
END

-- 保存使用的提示词
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('candidate_analysis_history') AND name = 'prompt')
BEGIN
    ALTER TABLE candidate_analysis_history
    ADD prompt NVARCHAR(MAX);
    PRINT '✅ 添加 prompt 字段成功';
END
ELSE
BEGIN
    PRINT 'ℹ️ prompt 字段已存在';
END

-- 保存解析后的结构化数据（JSON格式）
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('candidate_analysis_history') AND name = 'parsed_data')
BEGIN
    ALTER TABLE candidate_analysis_history
    ADD parsed_data NVARCHAR(MAX);
    PRINT '✅ 添加 parsed_data 字段成功';
END
ELSE
BEGIN
    PRINT 'ℹ️ parsed_data 字段已存在';
END

-- 评分等级
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('candidate_analysis_history') AND name = 'grade')
BEGIN
    ALTER TABLE candidate_analysis_history
    ADD grade NVARCHAR(50);
    PRINT '✅ 添加 grade 字段成功';
END
ELSE
BEGIN
    PRINT 'ℹ️ grade 字段已存在';
END

-- 优势 (Strengths)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('candidate_analysis_history') AND name = 'strengths')
BEGIN
    ALTER TABLE candidate_analysis_history
    ADD strengths NVARCHAR(MAX);
    PRINT '✅ 添加 strengths 字段成功';
END
ELSE
BEGIN
    PRINT 'ℹ️ strengths 字段已存在';
END

-- 劣势 (Weaknesses)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('candidate_analysis_history') AND name = 'weaknesses')
BEGIN
    ALTER TABLE candidate_analysis_history
    ADD weaknesses NVARCHAR(MAX);
    PRINT '✅ 添加 weaknesses 字段成功';
END
ELSE
BEGIN
    PRINT 'ℹ️ weaknesses 字段已存在';
END

-- 机会 (Opportunities)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('candidate_analysis_history') AND name = 'opportunities')
BEGIN
    ALTER TABLE candidate_analysis_history
    ADD opportunities NVARCHAR(MAX);
    PRINT '✅ 添加 opportunities 字段成功';
END
ELSE
BEGIN
    PRINT 'ℹ️ opportunities 字段已存在';
END

-- 威胁 (Threats)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('candidate_analysis_history') AND name = 'threats')
BEGIN
    ALTER TABLE candidate_analysis_history
    ADD threats NVARCHAR(MAX);
    PRINT '✅ 添加 threats 字段成功';
END
ELSE
BEGIN
    PRINT 'ℹ️ threats 字段已存在';
END

-- 结论
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('candidate_analysis_history') AND name = 'conclusion')
BEGIN
    ALTER TABLE candidate_analysis_history
    ADD conclusion NVARCHAR(MAX);
    PRINT '✅ 添加 conclusion 字段成功';
END
ELSE
BEGIN
    PRINT 'ℹ️ conclusion 字段已存在';
END

-- 运营建议（与description分开存储，description保存完整报告）
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('candidate_analysis_history') AND name = 'suggestions')
BEGIN
    ALTER TABLE candidate_analysis_history
    ADD suggestions NVARCHAR(MAX);
    PRINT '✅ 添加 suggestions 字段成功';
END
ELSE
BEGIN
    PRINT 'ℹ️ suggestions 字段已存在';
END

-- AI模型版本/配置信息（用于追溯不同版本的分析结果）
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('candidate_analysis_history') AND name = 'ai_model_version')
BEGIN
    ALTER TABLE candidate_analysis_history
    ADD ai_model_version NVARCHAR(100);
    PRINT '✅ 添加 ai_model_version 字段成功';
END
ELSE
BEGIN
    PRINT 'ℹ️ ai_model_version 字段已存在';
END

-- API调用元数据（用于调试和优化）
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('candidate_analysis_history') AND name = 'api_metadata')
BEGIN
    ALTER TABLE candidate_analysis_history
    ADD api_metadata NVARCHAR(MAX);
    PRINT '✅ 添加 api_metadata 字段成功';
END
ELSE
BEGIN
    PRINT 'ℹ️ api_metadata 字段已存在';
END

PRINT '';
PRINT '🎉 铺位分析历史表扩展完成！';
PRINT '';
PRINT '新增字段说明：';
PRINT '  - raw_ai_response: 原始AI响应文本';
PRINT '  - prompt: 使用的提示词';
PRINT '  - parsed_data: 解析后的结构化数据（JSON格式）';
PRINT '  - grade: 评分等级（优秀/良好/中等/风险高）';
PRINT '  - strengths: 优势分析';
PRINT '  - weaknesses: 劣势分析';
PRINT '  - opportunities: 机会分析';
PRINT '  - threats: 威胁分析';
PRINT '  - conclusion: 结论';
PRINT '  - suggestions: 运营建议';
PRINT '  - ai_model_version: AI模型版本';
PRINT '  - api_metadata: API调用元数据（如token使用量、响应时间等）';
PRINT '';

GO

