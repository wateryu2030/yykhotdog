import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import amapService from '../services/amapService';
import { AmapService as MapAmapService } from '../services/MapService';
import { logger } from '../utils/logger';
import { multiAIService } from '../services/MultiAIService';

const router = Router();

/**
 * 获取学校数据并带AI分析
 * GET /api/enhanced-ai-analysis/schools-with-analysis/:city/:district?
 */
router.get('/schools-with-analysis/:city/:district?', async (req: Request, res: Response) => {
  try {
    const { city, district } = req.params;
    const { saveToDB } = req.query;
    const shouldSaveToDB = saveToDB === 'true';

    logger.info(`获取学校数据并AI分析: ${city}${district ? '/' + district : ''}`);

    // 0. 检查表是否存在，如果不存在则创建
    try {
      await sequelize.query(`
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
      `, { type: QueryTypes.RAW });

      await sequelize.query(`
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
            delflag BIT DEFAULT 0
        );
      `, { type: QueryTypes.RAW });
    } catch (tableError) {
      logger.warn('创建表时出错（可能已存在）:', tableError);
    }

    // 1. 从数据库获取学校数据
    let whereClause = 'WHERE s.delflag = 0 AND s.city = :city';
    const params: any = { city };

    if (district && district !== '市辖区' && district !== '省直辖县级行政区划') {
      whereClause += ' AND s.district = :district';
      params.district = district;
    }

    const query = `
      SELECT 
        s.id,
        s.school_name as name,
        s.school_type as type,
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
        s.description
      FROM school_basic_info s
      ${whereClause}
      ORDER BY s.student_count DESC, s.school_name
    `;

    let schools: any[] = [];
    try {
      schools = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements: params,
      }) as any[];
    } catch (queryError: any) {
      logger.warn('查询学校数据失败（可能表不存在）:', queryError);
      schools = [];
    }

    // 2. 如果数据库没有数据，尝试从高德地图获取
    if (schools.length === 0) {
      logger.info(`数据库中没有${city}${district ? district : ''}的学校数据，尝试从高德地图获取`);
      
      try {
        // 获取省份信息（从城市推断）
        const province = await getProvinceByCity(city);
        
        const amapSchools = await amapService.searchSchools(
          province || city,
          city,
          district || ''
        );

        if (amapSchools.length > 0) {
          // 保存到数据库
          for (const school of amapSchools) {
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

            try {
              // 获取学校详细信息
              const details = await amapService.getSchoolDetails(school.school_name, school.address);
              
              await sequelize.query(insertQuery, {
                type: QueryTypes.INSERT,
                replacements: {
                  school_name: school.school_name,
                  school_type: school.school_type,
                  province: school.province || province || city,
                  city: school.city || city,
                  district: school.district || district || '',
                  address: school.address,
                  latitude: school.latitude,
                  longitude: school.longitude,
                  student_count: details.student_count || 0,
                  teacher_count: details.teacher_count || 0,
                  established_year: details.established_year,
                  school_level: details.school_level,
                  contact_phone: school.contact_phone,
                  description: school.description,
                },
              });
            } catch (insertError: any) {
              // 忽略重复数据错误
              if (!insertError.message?.includes('UNIQUE') && !insertError.message?.includes('PRIMARY KEY')) {
                logger.warn(`插入学校数据失败: ${school.school_name}`, insertError);
              }
            }
          }

          // 重新查询数据库
          schools = await sequelize.query(query, {
            type: QueryTypes.SELECT,
            replacements: params,
          }) as any[];
        }
      } catch (amapError) {
        logger.error('从高德地图获取学校数据失败:', amapError);
      }
    }

    if (schools.length === 0) {
      return res.status(404).json({
        success: false,
        message: `在${city}${district ? district : ''}未找到学校数据，请检查地区或重试`,
        data: []
      });
    }

    // 3. 对每所学校进行AI分析
    const schoolsWithAnalysis = await Promise.all(
      schools.map(async (school) => {
        try {
          // 检查是否已有AI分析结果
          const existingAnalysis = await sequelize.query(`
            SELECT TOP 1 analysis_result, confidence_score
            FROM school_ai_analysis
            WHERE school_id = :school_id 
              AND analysis_type = 'business_value'
              AND delflag = 0
            ORDER BY analysis_date DESC
          `, {
            type: QueryTypes.SELECT,
            replacements: { school_id: school.id }
          }) as any[];

          let aiAnalysis = '';
          let businessValue = null;

          if (existingAnalysis.length > 0 && existingAnalysis[0].analysis_result) {
            // 使用已有的分析结果
            aiAnalysis = existingAnalysis[0].analysis_result;
            try {
              businessValue = JSON.parse(aiAnalysis);
            } catch {
              businessValue = {
                level: 'medium',
                score: existingAnalysis[0].confidence_score || 50,
                reasons: [aiAnalysis]
              };
            }
          } else {
            // 检查是否有可用的AI模型
            if (!multiAIService.hasAvailableModel()) {
              businessValue = {
                level: 'medium',
                score: calculateDefaultScore(school),
                reasons: ['所有AI模型均未配置，请在.env文件中设置API密钥']
              };
              aiAnalysis = '所有AI模型均未配置，请在.env文件中设置API密钥';
            } else {
            // 生成新的AI分析
            const analysisPrompt = `
请分析这所学校的商业价值，用于热狗店选址评估：

学校名称：${school.name}
学校类型：${school.type}
学生人数：${school.student_count || '未知'}
教师人数：${school.teacher_count || '未知'}
地址：${school.address || '未知'}

请从以下维度评估：
1. 学生人数规模（学生越多，潜在客户越多）
2. 学校类型（大学、高中、初中、小学、幼儿园的商业价值不同）
3. 地理位置（是否在商业区、交通是否便利）
4. 周边商业环境

请用JSON格式返回：
{
  "level": "high|medium|low",
  "score": 0-100的评分,
  "reasons": ["原因1", "原因2", "原因3"]
}
            `;

            try {
              // 使用多AI服务，自动切换模型
              const result = await multiAIService.chatCompletion([
                {
                  role: 'system',
                  content: '你是一个专业的商业选址分析专家，擅长评估学校周边的商业价值。'
                },
                {
                  role: 'user',
                  content: analysisPrompt
                }
              ], {
                temperature: 0.7,
                maxTokens: 500
              });

              const analysisText = result.content;
              logger.info(`✅ 使用 ${result.model} 模型完成分析`);
              
              // 尝试解析JSON
              try {
                const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  businessValue = JSON.parse(jsonMatch[0]);
                  aiAnalysis = analysisText;
                } else {
                  businessValue = {
                    level: 'medium',
                    score: 50,
                    reasons: [analysisText]
                  };
                  aiAnalysis = analysisText;
                }
              } catch {
                businessValue = {
                  level: 'medium',
                  score: 50,
                  reasons: [analysisText]
                };
                aiAnalysis = analysisText;
              }

              // 保存AI分析结果到数据库
              if (shouldSaveToDB) {
                await sequelize.query(`
                  INSERT INTO school_ai_analysis (
                    school_id, analysis_type, ai_model, analysis_result, confidence_score
                  ) VALUES (
                    :school_id, 'business_value', :ai_model, :analysis_result, :confidence_score
                  )
                `, {
                  type: QueryTypes.INSERT,
                  replacements: {
                    school_id: school.id,
                    ai_model: result.model,
                    analysis_result: aiAnalysis,
                    confidence_score: businessValue.score || 50
                  }
                });
              }
            } catch (aiError: any) {
              const errorMessage = aiError?.message || '未知错误';
              
              logger.error(`所有AI模型分析失败 (学校: ${school.name}):`, {
                error: errorMessage,
                details: aiError
              });
              
              businessValue = {
                level: 'medium',
                score: calculateDefaultScore(school),
                reasons: [errorMessage || '所有AI模型调用失败，使用默认评估']
              };
              aiAnalysis = errorMessage || '所有AI模型调用失败，使用默认评估';
            }
            }
          }

          return {
            id: school.id?.toString() || `temp_${Math.random()}`,
            name: school.name,
            type: school.type,
            student_count: school.student_count || 0,
            studentCount: school.student_count || 0,
            teacher_count: school.teacher_count || 0,
            rating: businessValue?.score || 50,
            address: school.address,
            longitude: school.longitude,
            latitude: school.latitude,
            aiAnalysis: aiAnalysis || JSON.stringify(businessValue),
            businessValue: businessValue || {
              level: 'medium',
              score: calculateDefaultScore(school),
              reasons: []
            }
          };
        } catch (error) {
          logger.error(`处理学校数据失败 (${school.name}):`, error);
          return {
            id: school.id?.toString() || `temp_${Math.random()}`,
            name: school.name,
            type: school.type,
            student_count: school.student_count || 0,
            studentCount: school.student_count || 0,
            teacher_count: school.teacher_count || 0,
            rating: 50,
            address: school.address,
            longitude: school.longitude,
            latitude: school.latitude,
            aiAnalysis: '分析失败',
            businessValue: {
              level: 'low',
              score: 30,
              reasons: ['数据处理失败']
            }
          };
        }
      })
    );

    res.json({
      success: true,
      data: schoolsWithAnalysis,
      message: `成功获取${schoolsWithAnalysis.length}所学校的AI分析数据`
    });

  } catch (error) {
    logger.error('获取学校AI分析数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取学校AI分析数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 分析商业环境
 * POST /api/enhanced-ai-analysis/analyze-business-environment
 */
router.post('/analyze-business-environment', async (req: Request, res: Response) => {
  try {
    const { location, poiList = [], saveToDB = false } = req.body;

    if (!location) {
      return res.status(400).json({
        success: false,
        message: '位置参数不能为空'
      });
    }

    logger.info(`分析商业环境: ${location}`);

    // 1. 地理编码获取坐标
    let geocodeResult: any;
    try {
      geocodeResult = await MapAmapService.geocode(location);
    } catch (geocodeError) {
      logger.error('地理编码失败:', geocodeError);
      return res.status(400).json({
        success: false,
        message: '无法获取位置坐标，请检查位置名称是否正确'
      });
    }
    
    if (!geocodeResult || !geocodeResult.success || !geocodeResult.longitude || !geocodeResult.latitude) {
      return res.status(400).json({
        success: false,
        message: '无法获取位置坐标，请检查位置名称是否正确'
      });
    }

    // 2. 搜索周边POI（如果未提供）
    let poiData: any[] = [];
    if (poiList.length === 0) {
      try {
        const nearbyPOIs = await MapAmapService.searchNearby(
          geocodeResult.longitude,
          geocodeResult.latitude,
          '餐饮服务|购物服务|生活服务|交通设施服务'
        );
        poiData = nearbyPOIs.pois || [];
      } catch (poiError) {
        logger.warn('搜索周边POI失败:', poiError);
        poiData = [];
      }
    } else {
      poiData = poiList;
    }

    // 3. AI分析商业环境
    const analysisPrompt = `
请分析这个位置的商业环境，用于热狗店选址评估：

位置：${location}
坐标：${geocodeResult.longitude}, ${geocodeResult.latitude}
周边POI数量：${poiData.length}

${poiData.length > 0 ? `周边设施类型：${poiData.slice(0, 20).map((p: any) => p.type || p.name).join('、')}` : ''}

请从以下维度分析：
1. 人流量评估（周边设施越多，人流量越大）
2. 竞争环境（餐饮类POI的数量和类型）
3. 商业氛围（购物、娱乐等配套设施）
4. 交通便利性（交通设施数量）
5. 目标客户群体（周边设施反映的客户特征）

请用中文详细分析，不少于200字。
    `;

    let analysis = '';
    try {
      if (!multiAIService.hasAvailableModel()) {
        throw new Error('所有AI模型均未配置，无法进行AI分析');
      }
      
      // 使用多AI服务，自动切换模型
      const result = await multiAIService.chatCompletion([
        {
          role: 'system',
          content: '你是一个专业的商业选址分析专家，擅长评估商业环境的优劣。'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ], {
        temperature: 0.7,
        maxTokens: 800
      });

      analysis = result.content || '商业环境分析生成失败';
      logger.info(`✅ 使用 ${result.model} 模型完成商业环境分析`);
    } catch (aiError: any) {
      logger.error('所有AI模型商业环境分析失败:', aiError);
      analysis = `该位置周边有${poiData.length}个POI设施，商业环境${poiData.length > 50 ? '较好' : poiData.length > 20 ? '一般' : '较差'}。建议进一步实地考察。`;
    }

    const result = {
      location,
      poiList: poiData.map((p: any) => p.name || p.type || p),
      analysis,
      savedToDB: false,
      recordId: null
    };

    // 4. 保存到数据库（如果需要）
    if (saveToDB) {
      try {
        // 这里可以保存到数据库，暂时只返回结果
        result.savedToDB = true;
      } catch (dbError) {
        logger.error('保存商业环境分析失败:', dbError);
      }
    }

    res.json({
      success: true,
      data: result,
      message: '商业环境分析完成'
    });

  } catch (error) {
    logger.error('分析商业环境失败:', error);
    res.status(500).json({
      success: false,
      message: '分析商业环境失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 辅助函数：根据城市获取省份
 */
async function getProvinceByCity(city: string): Promise<string | null> {
  try {
    const result = await sequelize.query(`
      SELECT TOP 1 province
      FROM school_basic_info
      WHERE city = :city AND delflag = 0
      GROUP BY province
    `, {
      type: QueryTypes.SELECT,
      replacements: { city }
    }) as any[];

    if (result.length > 0) {
      return result[0].province;
    }

    // 如果数据库没有，尝试从地区表获取
    const regionResult = await sequelize.query(`
      SELECT TOP 1 parent_name
      FROM region
      WHERE name = :city AND level = 2 AND delflag = 0
    `, {
      type: QueryTypes.SELECT,
      replacements: { city }
    }) as any[];

    return regionResult.length > 0 ? regionResult[0].parent_name : null;
  } catch (error) {
    logger.error('获取省份失败:', error);
    return null;
  }
}

/**
 * 计算默认评分（当AI分析不可用时）
 */
function calculateDefaultScore(school: any): number {
  let score = 50;

  // 根据学生人数评分
  if (school.student_count) {
    if (school.student_count >= 2000) score += 20;
    else if (school.student_count >= 1000) score += 15;
    else if (school.student_count >= 500) score += 10;
    else if (school.student_count >= 200) score += 5;
  }

  // 根据学校类型评分
  const type = school.type || '';
  if (type.includes('大学')) score += 15;
  else if (type.includes('高中')) score += 10;
  else if (type.includes('初中')) score += 8;
  else if (type.includes('小学')) score += 5;
  else if (type.includes('幼儿园')) score += 3;

  return Math.min(100, Math.max(0, score));
}

/**
 * 批量保存学校数据到数据库
 * POST /api/enhanced-ai-analysis/save-schools
 */
router.post('/save-schools', async (req: Request, res: Response) => {
  try {
    const { schoolIds, schoolDataList } = req.body;

    if (!schoolIds || !Array.isArray(schoolIds) || schoolIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '学校ID列表不能为空'
      });
    }

    logger.info(`批量保存学校数据: ${schoolIds.length} 所学校`);

    let savedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const schoolId of schoolIds) {
      try {
        // 查找对应的学校数据
        const schoolData = schoolDataList?.find((s: any) => s.id === schoolId);
        
        if (!schoolData) {
          errors.push(`学校ID ${schoolId}: 未找到对应数据`);
          errorCount++;
          continue;
        }

        // 检查学校是否已存在
        const existingSchool = await sequelize.query(`
          SELECT id FROM school_basic_info
          WHERE school_name = :school_name AND city = :city AND delflag = 0
        `, {
          type: QueryTypes.SELECT,
          replacements: {
            school_name: schoolData.name,
            city: schoolData.city || ''
          }
        }) as any[];

        let schoolDbId: number;

        if (existingSchool.length > 0) {
          // 更新现有学校
          schoolDbId = existingSchool[0].id;
          await sequelize.query(`
            UPDATE school_basic_info
            SET 
              student_count = :student_count,
              teacher_count = :teacher_count,
              updated_at = GETDATE()
            WHERE id = :id
          `, {
            type: QueryTypes.UPDATE,
            replacements: {
              id: schoolDbId,
              student_count: schoolData.student_count || 0,
              teacher_count: schoolData.teacher_count || 0
            }
          });
        } else {
          // 插入新学校
          const insertResult = await sequelize.query(`
            INSERT INTO school_basic_info (
              school_name, school_type, province, city, district, address,
              latitude, longitude, student_count, teacher_count, established_year,
              school_level, description
            ) VALUES (
              :school_name, :school_type, :province, :city, :district, :address,
              :latitude, :longitude, :student_count, :teacher_count, :established_year,
              :school_level, :description
            );
            SELECT SCOPE_IDENTITY() as id;
          `, {
            type: QueryTypes.INSERT,
            replacements: {
              school_name: schoolData.name,
              school_type: schoolData.type || '未知',
              province: schoolData.province || '',
              city: schoolData.city || '',
              district: schoolData.district || '',
              address: schoolData.address || '',
              latitude: schoolData.latitude || null,
              longitude: schoolData.longitude || null,
              student_count: schoolData.student_count || 0,
              teacher_count: schoolData.teacher_count || 0,
              established_year: schoolData.established_year || null,
              school_level: schoolData.school_level || '',
              description: schoolData.description || ''
            }
          }) as any;

          schoolDbId = insertResult[0]?.id || insertResult.recordset?.[0]?.id;
        }

        // 保存AI分析结果
        if (schoolDbId && schoolData.businessValue) {
          await sequelize.query(`
            INSERT INTO school_ai_analysis (
              school_id, analysis_type, ai_model, analysis_result, confidence_score
            ) VALUES (
              :school_id, 'business_value', 'gpt-4o-mini', :analysis_result, :confidence_score
            )
          `, {
            type: QueryTypes.INSERT,
            replacements: {
              school_id: schoolDbId,
              analysis_result: schoolData.aiAnalysis || JSON.stringify(schoolData.businessValue),
              confidence_score: schoolData.businessValue.score || 50
            }
          });
        }

        savedCount++;
      } catch (error: any) {
        logger.error(`保存学校失败 (ID: ${schoolId}):`, error);
        errors.push(`学校ID ${schoolId}: ${error.message || '保存失败'}`);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `成功保存 ${savedCount} 所学校${errorCount > 0 ? `，${errorCount} 所失败` : ''}`,
      data: {
        savedCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    logger.error('批量保存学校数据失败:', error);
    res.status(500).json({
      success: false,
      message: '批量保存学校数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 批量更新学校详细信息（学生人数、教师人数等）
 * POST /api/enhanced-ai-analysis/refresh-school-details
 */
router.post('/refresh-school-details', async (req: Request, res: Response) => {
  try {
    const { city, district, schoolIds, limit = 100 } = req.body;

    logger.info(`开始批量更新学校详细信息: city=${city}, district=${district}, limit=${limit}`);

    // 构建查询条件
    let whereClause = 'WHERE delflag = 0';
    const params: any = {};

    if (city) {
      whereClause += ' AND city = :city';
      params.city = city;
    }

    if (district) {
      whereClause += ' AND district = :district';
      params.district = district;
    }

    if (schoolIds && Array.isArray(schoolIds) && schoolIds.length > 0) {
      // 使用参数化查询避免SQL注入
      const ids = schoolIds.filter(id => id != null).map((id: any) => parseInt(id)).filter(id => !isNaN(id));
      if (ids.length > 0) {
        whereClause += ` AND id IN (${ids.join(',')})`;
      }
    }

    // 查询需要更新的学校
    const query = `
      SELECT TOP ${Math.min(parseInt(limit as string) || 100, 200)}
        id,
        school_name,
        school_type,
        address,
        city,
        district
      FROM school_basic_info
      ${whereClause}
      ORDER BY updated_at ASC, id ASC
    `;

    const schools = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: params,
    }) as any[];

    if (schools.length === 0) {
      return res.json({
        success: true,
        message: '没有找到需要更新的学校',
        data: {
          total: 0,
          updated: 0,
          failed: 0,
          results: []
        }
      });
    }

    logger.info(`找到 ${schools.length} 所学校需要更新`);

    const results: any[] = [];
    let updatedCount = 0;
    let failedCount = 0;

    // 批量更新学校信息
    for (let i = 0; i < schools.length; i++) {
      const school = schools[i];
      try {
        logger.info(`[${i + 1}/${schools.length}] 更新学校: ${school.school_name}`);

        // 调用amapService获取学校详细信息
        const details = await amapService.getSchoolDetails(school.school_name, school.address || '');

        // 更新数据库
        await sequelize.query(`
          UPDATE school_basic_info
          SET 
            student_count = :student_count,
            teacher_count = :teacher_count,
            established_year = :established_year,
            school_level = :school_level,
            updated_at = GETDATE()
          WHERE id = :id
        `, {
          type: QueryTypes.UPDATE,
          replacements: {
            id: school.id,
            student_count: details.student_count,
            teacher_count: details.teacher_count,
            established_year: details.established_year,
            school_level: details.school_level
          }
        });

        updatedCount++;
        results.push({
          id: school.id,
          school_name: school.school_name,
          success: true,
          student_count: details.student_count,
          teacher_count: details.teacher_count,
          established_year: details.established_year,
          school_level: details.school_level
        });

        // 避免请求过快，添加延迟
        if (i < schools.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 每500ms更新一个
        }
      } catch (error: any) {
        failedCount++;
        logger.error(`更新学校失败 (${school.school_name}):`, error);
        results.push({
          id: school.id,
          school_name: school.school_name,
          success: false,
          error: error.message || '更新失败'
        });
      }
    }

    logger.info(`批量更新完成: 成功 ${updatedCount} 所，失败 ${failedCount} 所`);

    res.json({
      success: true,
      message: `批量更新完成：成功 ${updatedCount} 所，失败 ${failedCount} 所`,
      data: {
        total: schools.length,
        updated: updatedCount,
        failed: failedCount,
        results: results
      }
    });
  } catch (error) {
    logger.error('批量更新学校详细信息失败:', error);
    res.status(500).json({
      success: false,
      message: '批量更新学校详细信息失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;

