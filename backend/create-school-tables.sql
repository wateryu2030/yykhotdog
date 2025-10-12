-- 创建学校基础信息表
CREATE TABLE school_basic_info (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    school_name NVARCHAR(200) NOT NULL,
    school_type NVARCHAR(50) NOT NULL, -- 小学、初中、高中、职业学校、大学、培训机构
    province NVARCHAR(50) NOT NULL,
    city NVARCHAR(50) NOT NULL,
    district NVARCHAR(50) NOT NULL,
    address NVARCHAR(500),
    latitude DECIMAL(10, 7), -- 纬度
    longitude DECIMAL(10, 7), -- 经度
    student_count INT, -- 学生人数
    teacher_count INT, -- 教师人数
    established_year INT, -- 建校年份
    school_level NVARCHAR(20), -- 学校等级：重点、普通等
    contact_phone NVARCHAR(20),
    website NVARCHAR(200),
    description NVARCHAR(1000),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    delflag BIT DEFAULT 0
);

-- 创建AI分析结果表
CREATE TABLE school_ai_analysis (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    school_id BIGINT NOT NULL,
    analysis_type NVARCHAR(50) NOT NULL, -- 人数分析、位置分析、市场分析等
    ai_model NVARCHAR(100), -- 使用的AI模型
    analysis_result NVARCHAR(MAX), -- JSON格式的分析结果
    confidence_score DECIMAL(3,2), -- 置信度分数 0-1
    analysis_date DATETIME2 DEFAULT GETDATE(),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    delflag BIT DEFAULT 0,
    FOREIGN KEY (school_id) REFERENCES school_basic_info(id)
);

-- 创建用户选择的学校表
CREATE TABLE user_selected_schools (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id NVARCHAR(100), -- 用户ID，可以是open_id或其他标识
    school_id BIGINT NOT NULL,
    selection_reason NVARCHAR(500), -- 选择原因
    priority_level INT DEFAULT 1, -- 优先级 1-5
    is_selected BIT DEFAULT 1,
    selected_at DATETIME2 DEFAULT GETDATE(),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    delflag BIT DEFAULT 0,
    FOREIGN KEY (school_id) REFERENCES school_basic_info(id)
);

-- 创建学校区域关联表
CREATE TABLE school_region_mapping (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    school_id BIGINT NOT NULL,
    province_code NVARCHAR(10),
    city_code NVARCHAR(10),
    district_code NVARCHAR(10),
    region_name NVARCHAR(100),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (school_id) REFERENCES school_basic_info(id)
);

-- 创建索引
CREATE INDEX IX_school_basic_info_region ON school_basic_info(province, city, district);
CREATE INDEX IX_school_basic_info_type ON school_basic_info(school_type);
CREATE INDEX IX_school_basic_info_student_count ON school_basic_info(student_count);
CREATE INDEX IX_school_ai_analysis_school_id ON school_ai_analysis(school_id);
CREATE INDEX IX_user_selected_schools_user_id ON user_selected_schools(user_id);
CREATE INDEX IX_school_region_mapping_codes ON school_region_mapping(province_code, city_code, district_code);

-- 添加注释
EXEC sp_addextendedproperty 'MS_Description', '学校基础信息表', 'SCHEMA', 'dbo', 'TABLE', 'school_basic_info';
EXEC sp_addextendedproperty 'MS_Description', 'AI分析结果表', 'SCHEMA', 'dbo', 'TABLE', 'school_ai_analysis';
EXEC sp_addextendedproperty 'MS_Description', '用户选择的学校表', 'SCHEMA', 'dbo', 'TABLE', 'user_selected_schools';
EXEC sp_addextendedproperty 'MS_Description', '学校区域关联表', 'SCHEMA', 'dbo', 'TABLE', 'school_region_mapping';
