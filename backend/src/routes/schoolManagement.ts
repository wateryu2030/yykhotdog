import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import amapService from '../services/amapService';
import { logger } from '../utils/logger';

const router = Router();

// 创建学校相关表的API
router.post('/create-tables', async (req: Request, res: Response) => {
  try {
    const createTablesSQL = `
      -- 创建学校基础信息表
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='school_basic_info' AND xtype='U')
      CREATE TABLE school_basic_info (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          school_name NVARCHAR(200) NOT NULL,
          school_type NVARCHAR(50) NOT NULL,
          province NVARCHAR(50) NOT NULL,
          city NVARCHAR(50) NOT NULL,
          district NVARCHAR(50) NOT NULL,
          address NVARCHAR(500),
          latitude DECIMAL(10, 7),
          longitude DECIMAL(10, 7),
          student_count INT,
          teacher_count INT,
          established_year INT,
          school_level NVARCHAR(20),
          contact_phone NVARCHAR(20),
          website NVARCHAR(200),
          description NVARCHAR(1000),
          is_active BIT DEFAULT 1,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          delflag BIT DEFAULT 0
      );

      -- 创建AI分析结果表
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='school_ai_analysis' AND xtype='U')
      CREATE TABLE school_ai_analysis (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          school_id BIGINT NOT NULL,
          analysis_type NVARCHAR(50) NOT NULL,
          ai_model NVARCHAR(100),
          analysis_result NVARCHAR(MAX),
          confidence_score DECIMAL(3,2),
          analysis_date DATETIME2 DEFAULT GETDATE(),
          is_active BIT DEFAULT 1,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          delflag BIT DEFAULT 0,
          FOREIGN KEY (school_id) REFERENCES school_basic_info(id)
      );

      -- 创建用户选择的学校表
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_selected_schools' AND xtype='U')
      CREATE TABLE user_selected_schools (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          user_id NVARCHAR(100),
          school_id BIGINT NOT NULL,
          selection_reason NVARCHAR(500),
          priority_level INT DEFAULT 1,
          is_selected BIT DEFAULT 1,
          selected_at DATETIME2 DEFAULT GETDATE(),
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          delflag BIT DEFAULT 0,
          FOREIGN KEY (school_id) REFERENCES school_basic_info(id)
      );

      -- 创建学校区域关联表
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='school_region_mapping' AND xtype='U')
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
    `;

    await sequelize.query(createTablesSQL, { type: QueryTypes.RAW });

    // 创建索引
    const createIndexesSQL = `
      -- 创建索引
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_school_basic_info_region')
      CREATE INDEX IX_school_basic_info_region ON school_basic_info(province, city, district);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_school_basic_info_type')
      CREATE INDEX IX_school_basic_info_type ON school_basic_info(school_type);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_school_basic_info_student_count')
      CREATE INDEX IX_school_basic_info_student_count ON school_basic_info(student_count);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_school_ai_analysis_school_id')
      CREATE INDEX IX_school_ai_analysis_school_id ON school_ai_analysis(school_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_user_selected_schools_user_id')
      CREATE INDEX IX_user_selected_schools_user_id ON user_selected_schools(user_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_school_region_mapping_codes')
      CREATE INDEX IX_school_region_mapping_codes ON school_region_mapping(province_code, city_code, district_code);
    `;

    await sequelize.query(createIndexesSQL, { type: QueryTypes.RAW });

    res.json({
      success: true,
      message: '学校相关表创建成功',
      tables: [
        'school_basic_info',
        'school_ai_analysis',
        'user_selected_schools',
        'school_region_mapping',
      ],
    });
  } catch (error) {
    console.error('创建表失败:', error);
    res.status(500).json({
      success: false,
      error: '创建表失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取学校列表
router.get('/schools', async (req: Request, res: Response) => {
  try {
    const { province, city, district, school_type, min_students, useAmap } = req.query;

    let whereClause = 'WHERE s.delflag = 0';
    const params: any = {};

    if (province) {
      whereClause += ' AND s.province = :province';
      params.province = province;
    }
    if (city) {
      whereClause += ' AND s.city = :city';
      params.city = city;
    }
    if (district) {
      whereClause += ' AND s.district = :district';
      params.district = district;
    }
    if (school_type) {
      whereClause += ' AND s.school_type = :school_type';
      params.school_type = school_type;
    }
    if (min_students) {
      whereClause += ' AND s.student_count >= :min_students';
      params.min_students = parseInt(min_students as string);
    }

    const query = `
      SELECT 
        s.id,
        s.school_name,
        s.school_type,
        s.province,
        s.city,
        s.district,
        s.address,
        s.latitude,
        s.longitude,
        s.student_count,
        s.teacher_count,
        s.established_year,
        s.school_level,
        s.contact_phone,
        s.website,
        s.description,
        s.created_at
      FROM school_basic_info s
      ${whereClause}
      ORDER BY s.student_count DESC, s.school_name
    `;

    let schools = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: params,
    });

    // 如果本地数据库没有数据，且用户要求使用高德地图API
    if (schools.length === 0 && useAmap === 'true' && province && city && district) {
      logger.info(`本地数据库中没有${province}${city}${district}的学校数据，尝试从高德地图获取`);

      try {
        // 从高德地图获取学校数据
        const amapSchools = await amapService.searchSchools(
          province as string,
          city as string,
          district as string
        );

        if (amapSchools.length > 0) {
          // 保存到数据库
          for (const school of amapSchools) {
            const details = await amapService.getSchoolDetails(school.school_name, school.address);

            const insertQuery = `
              INSERT INTO school_basic_info (
                school_name, school_type, province, city, district, address,
                latitude, longitude, student_count, teacher_count, established_year,
                school_level, contact_phone, description
              ) VALUES (
                :school_name, :school_type, :province, :city, :district, :address,
                :latitude, :longitude, :student_count, :teacher_count, :established_year,
                :school_level, :contact_phone, :description
              )
            `;

            await sequelize.query(insertQuery, {
              type: QueryTypes.INSERT,
              replacements: {
                school_name: school.school_name,
                school_type: school.school_type,
                province: school.province,
                city: school.city,
                district: school.district,
                address: school.address,
                latitude: school.latitude,
                longitude: school.longitude,
                student_count: details.student_count,
                teacher_count: details.teacher_count,
                established_year: details.established_year,
                school_level: details.school_level,
                contact_phone: school.contact_phone,
                description: school.description,
              },
            });
          }

          // 重新查询数据库获取保存的数据
          schools = await sequelize.query(query, {
            type: QueryTypes.SELECT,
            replacements: params,
          });

          logger.info(`成功从高德地图获取并保存了${schools.length}所学校的数据`);
        } else {
          logger.warn(`高德地图API未找到${province}${city}${district}的学校数据`);
        }
      } catch (amapError) {
        logger.error('从高德地图获取学校数据失败:', amapError);
        // 返回错误信息给前端
        return res.status(500).json({
          success: false,
          error: '从高德地图获取学校数据失败',
          details: amapError instanceof Error ? amapError.message : '未知错误',
        });
      }
    }

    res.json({
      success: true,
      data: schools,
      total: schools.length,
    });
  } catch (error) {
    logger.error('获取学校列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取学校列表失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 添加学校
router.post('/schools', async (req: Request, res: Response) => {
  try {
    const {
      school_name,
      school_type,
      province,
      city,
      district,
      address,
      latitude,
      longitude,
      student_count,
      teacher_count,
      established_year,
      school_level,
      contact_phone,
      website,
      description,
    } = req.body;

    const insertQuery = `
      INSERT INTO school_basic_info (
        school_name, school_type, province, city, district, address,
        latitude, longitude, student_count, teacher_count, established_year,
        school_level, contact_phone, website, description
      ) VALUES (
        :school_name, :school_type, :province, :city, :district, :address,
        :latitude, :longitude, :student_count, :teacher_count, :established_year,
        :school_level, :contact_phone, :website, :description
      )
    `;

    await sequelize.query(insertQuery, {
      type: QueryTypes.INSERT,
      replacements: {
        school_name,
        school_type,
        province,
        city,
        district,
        address,
        latitude,
        longitude,
        student_count,
        teacher_count,
        established_year,
        school_level,
        contact_phone,
        website,
        description,
      },
    });

    res.json({
      success: true,
      message: '学校添加成功',
    });
  } catch (error) {
    console.error('添加学校失败:', error);
    res.status(500).json({
      success: false,
      error: '添加学校失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 保存用户选择的学校
router.post('/selected-schools', async (req: Request, res: Response) => {
  try {
    const { user_id, school_ids, selection_reason, priority_level } = req.body;

    if (!user_id || !school_ids || !Array.isArray(school_ids)) {
      return res.status(400).json({
        success: false,
        error: '参数错误：user_id和school_ids是必需的',
      });
    }

    // 先删除用户之前的选择
    await sequelize.query('UPDATE user_selected_schools SET delflag = 1 WHERE user_id = :user_id', {
      type: QueryTypes.UPDATE,
      replacements: { user_id },
    });

    // 插入新的选择
    for (const school_id of school_ids) {
      await sequelize.query(
        `
        INSERT INTO user_selected_schools (user_id, school_id, selection_reason, priority_level)
        VALUES (:user_id, :school_id, :selection_reason, :priority_level)
      `,
        {
          type: QueryTypes.INSERT,
          replacements: {
            user_id,
            school_id,
            selection_reason: selection_reason || '',
            priority_level: priority_level || 1,
          },
        }
      );
    }

    res.json({
      success: true,
      message: '学校选择保存成功',
      selected_count: school_ids.length,
    });
  } catch (error) {
    console.error('保存学校选择失败:', error);
    res.status(500).json({
      success: false,
      error: '保存学校选择失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取用户选择的学校
router.get('/selected-schools/:user_id', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;

    const query = `
      SELECT 
        s.id,
        s.school_name,
        s.school_type,
        s.province,
        s.city,
        s.district,
        s.address,
        s.latitude,
        s.longitude,
        s.student_count,
        s.teacher_count,
        s.school_level,
        us.selection_reason,
        us.priority_level,
        us.selected_at
      FROM user_selected_schools us
      INNER JOIN school_basic_info s ON us.school_id = s.id
      WHERE us.user_id = :user_id 
        AND us.delflag = 0 
        AND s.delflag = 0
      ORDER BY us.priority_level DESC, us.selected_at DESC
    `;

    const selectedSchools = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: { user_id },
    });

    res.json({
      success: true,
      data: selectedSchools,
      total: selectedSchools.length,
    });
  } catch (error) {
    console.error('获取用户选择的学校失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户选择的学校失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

export default router;
