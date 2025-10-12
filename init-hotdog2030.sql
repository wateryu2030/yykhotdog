-- hotdog2030数据库初始化脚本
-- 创建hotdog2030数据库的表结构

USE [hotdog2030]
GO

-- 1. 创建学校基础信息表
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

-- 2. 创建AI分析结果表
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

-- 3. 创建用户选择的学校表
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

-- 4. 创建学校区域关联表
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

-- 5. 创建外键约束
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

-- 6. 创建索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[school_basic_info]') AND name = N'IX_school_basic_info_region')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_school_basic_info_region] ON [dbo].[school_basic_info] 
    ([province] ASC, [city] ASC, [district] ASC);
    PRINT '创建索引: IX_school_basic_info_region'
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[school_basic_info]') AND name = N'IX_school_basic_info_type')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_school_basic_info_type] ON [dbo].[school_basic_info] 
    ([school_type] ASC);
    PRINT '创建索引: IX_school_basic_info_type'
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[school_basic_info]') AND name = N'IX_school_basic_info_student_count')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_school_basic_info_student_count] ON [dbo].[school_basic_info] 
    ([student_count] ASC);
    PRINT '创建索引: IX_school_basic_info_student_count'
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[school_ai_analysis]') AND name = N'IX_school_ai_analysis_school_id')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_school_ai_analysis_school_id] ON [dbo].[school_ai_analysis] 
    ([school_id] ASC);
    PRINT '创建索引: IX_school_ai_analysis_school_id'
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[user_selected_schools]') AND name = N'IX_user_selected_schools_user_id')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_user_selected_schools_user_id] ON [dbo].[user_selected_schools] 
    ([user_id] ASC);
    PRINT '创建索引: IX_user_selected_schools_user_id'
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[school_region_mapping]') AND name = N'IX_school_region_mapping_codes')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_school_region_mapping_codes] ON [dbo].[school_region_mapping] 
    ([province_code] ASC, [city_code] ASC, [district_code] ASC);
    PRINT '创建索引: IX_school_region_mapping_codes'
END
GO

-- 7. 添加表注释
IF NOT EXISTS (SELECT * FROM sys.extended_properties WHERE major_id = OBJECT_ID(N'[dbo].[school_basic_info]') AND minor_id = 0 AND name = N'MS_Description')
BEGIN
    EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'学校基础信息表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'school_basic_info';
END
GO

IF NOT EXISTS (SELECT * FROM sys.extended_properties WHERE major_id = OBJECT_ID(N'[dbo].[school_ai_analysis]') AND minor_id = 0 AND name = N'MS_Description')
BEGIN
    EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'AI分析结果表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'school_ai_analysis';
END
GO

IF NOT EXISTS (SELECT * FROM sys.extended_properties WHERE major_id = OBJECT_ID(N'[dbo].[user_selected_schools]') AND minor_id = 0 AND name = N'MS_Description')
BEGIN
    EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'用户选择的学校表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'user_selected_schools';
END
GO

IF NOT EXISTS (SELECT * FROM sys.extended_properties WHERE major_id = OBJECT_ID(N'[dbo].[school_region_mapping]') AND minor_id = 0 AND name = N'MS_Description')
BEGIN
    EXEC sys.sp_addextendedproperty @name = N'MS_Description', @value = N'学校区域关联表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'school_region_mapping';
END
GO

PRINT 'hotdog2030数据库初始化完成！'
PRINT '已创建以下表:'
PRINT '- school_basic_info (学校基础信息表)'
PRINT '- school_ai_analysis (AI分析结果表)'
PRINT '- user_selected_schools (用户选择的学校表)'
PRINT '- school_region_mapping (学校区域关联表)'
