import { Router, Request, Response } from 'express';
import { SiteSelectionService, EnhancedSiteSelectionService } from '../services/SiteSelectionService';
import { MLSiteSelectionService } from '../services/MLSiteSelectionService';
import { SiteSelection } from '../models/SiteSelection';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { logger } from '../utils/logger';
import { MultiAIService } from '../services/MultiAIService';

const router = Router();

/**
 * @swagger
 * /api/site-selection/analyze:
 *   post:
 *     summary: 执行智能选址分析
 *     tags: [Site Selection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - location
 *             properties:
 *               location:
 *                 type: string
 *                 description: 位置描述
 *                 example: "北京市朝阳区望京SOHO"
 *               includeMLPrediction:
 *                 type: boolean
 *                 description: 是否包含机器学习预测
 *                 default: true
 *     responses:
 *       200:
 *         description: 选址分析结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     location:
 *                       type: string
 *                     coordinates:
 *                       type: object
 *                       properties:
 *                         longitude:
 *                           type: number
 *                         latitude:
 *                           type: number
 *                     scores:
 *                       type: object
 *                       properties:
 *                         poiDensity:
 *                           type: number
 *                         populationDensity:
 *                           type: number
 *                         trafficAccessibility:
 *                           type: number
 *                         competitionLevel:
 *                           type: number
 *                         rentalCost:
 *                           type: number
 *                         footTraffic:
 *                           type: number
 *                         overallScore:
 *                           type: number
 *                     analysis:
 *                       type: object
 *                       properties:
 *                         strengths:
 *                           type: array
 *                           items:
 *                             type: string
 *                         weaknesses:
 *                           type: array
 *                           items:
 *                             type: string
 *                         recommendations:
 *                           type: array
 *                           items:
 *                             type: string
 *                         riskLevel:
 *                           type: string
 *                           enum: [low, medium, high]
 *                     predictions:
 *                       type: object
 *                       properties:
 *                         expectedRevenue:
 *                           type: number
 *                         confidence:
 *                           type: number
 *                         breakEvenTime:
 *                           type: number
 *                     data:
 *                       type: object
 *                       properties:
 *                         nearbyPOIs:
 *                           type: array
 *                         schools:
 *                           type: array
 *                         competitors:
 *                           type: array
 *                         trafficStations:
 *                           type: array
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { location, includeMLPrediction = true } = req.body;
    
    if (!location) {
      return res.status(400).json({
        success: false,
        message: '位置参数不能为空'
      });
    }
    
    logger.info(`开始选址分析: ${location}`);
    
    // 执行完整的选址分析
    const result = await EnhancedSiteSelectionService.performSiteAnalysis(location);
    
    res.json({
      success: true,
      data: result,
      message: '选址分析完成'
    });
    
  } catch (error) {
    logger.error('选址分析失败:', error);
    res.status(500).json({
      success: false,
      message: '选址分析失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/site-selection/ml-predict:
 *   post:
 *     summary: 机器学习选址预测
 *     tags: [Site Selection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - location
 *             properties:
 *               location:
 *                 type: string
 *                 description: 位置描述
 *                 example: "北京市朝阳区望京SOHO"
 *               longitude:
 *                 type: number
 *                 description: 经度
 *               latitude:
 *                 type: number
 *                 description: 纬度
 *     responses:
 *       200:
 *         description: 机器学习预测结果
 */
router.post('/ml-predict', async (req: Request, res: Response) => {
  try {
    const { location, longitude, latitude } = req.body;
    
    if (!location) {
      return res.status(400).json({
        success: false,
        message: '位置参数不能为空'
      });
    }
    
    logger.info(`开始机器学习预测: ${location}`);
    
    // 提取特征
    const features = await MLSiteSelectionService.extractFeaturesFromLocation(
      location, 
      longitude || 116.3974, 
      latitude || 39.9093
    );
    
    // 执行机器学习预测
    const prediction = await MLSiteSelectionService.predictWithML(features);
    
    res.json({
      success: true,
      data: {
        features,
        prediction
      },
      message: '机器学习预测完成'
    });
    
  } catch (error) {
    logger.error('机器学习预测失败:', error);
    res.status(500).json({
      success: false,
      message: '机器学习预测失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/site-selection/train-model:
 *   post:
 *     summary: 训练机器学习模型
 *     tags: [Site Selection]
 *     responses:
 *       200:
 *         description: 模型训练结果
 */
router.post('/train-model', async (req: Request, res: Response) => {
  try {
    logger.info('开始训练机器学习模型...');
    
    // 训练模型
    const model = await MLSiteSelectionService.trainModel();
    
    res.json({
      success: true,
      data: {
        modelType: model.type,
        trainingCompleted: true,
        message: '模型训练完成'
      },
      message: '机器学习模型训练完成'
    });
    
  } catch (error) {
    logger.error('模型训练失败:', error);
    res.status(500).json({
      success: false,
      message: '模型训练失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/site-selection/history:
 *   get:
 *     summary: 获取历史选址分析记录
 *     tags: [Site Selection]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: 城市筛选
 *     responses:
 *       200:
 *         description: 历史记录列表
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, city } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereClause = '';
    if (city) {
      whereClause = `WHERE city = '${city}'`;
    }
    
    const query = `
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
        poi_density_score,
        traffic_score,
        population_score,
        competition_score,
        status,
        created_at
      FROM site_selections 
      ${whereClause}
      ORDER BY created_at DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM site_selections 
      ${whereClause}
    `;
    
    const [records, countResult] = await Promise.all([
      sequelize.query(query, { type: QueryTypes.SELECT }),
      sequelize.query(countQuery, { type: QueryTypes.SELECT })
    ]);
    
    const total = (countResult[0] as any).total;
    
    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      },
      message: '获取历史记录成功'
    });
    
  } catch (error) {
    logger.error('获取历史记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取历史记录失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/site-selection/compare:
 *   post:
 *     summary: 多位置对比分析
 *     tags: [Site Selection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - locations
 *             properties:
 *               locations:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 位置列表
 *                 example: ["北京市朝阳区望京SOHO", "上海市浦东新区陆家嘴"]
 *     responses:
 *       200:
 *         description: 对比分析结果
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { locations } = req.body;
    
    if (!locations || !Array.isArray(locations) || locations.length < 2) {
      return res.status(400).json({
        success: false,
        message: '至少需要提供2个位置进行对比'
      });
    }
    
    logger.info(`开始多位置对比分析: ${locations.join(', ')}`);
    
    // 并行分析所有位置
    const analysisResults = await Promise.allSettled(
      locations.map(location => 
        EnhancedSiteSelectionService.performSiteAnalysis(location)
      )
    );
    
    // 处理结果
    const results = analysisResults.map((result, index) => ({
      location: locations[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
    
    // 生成对比分析
    const comparison = generateComparisonAnalysis(results);
    
    res.json({
      success: true,
      data: {
        results,
        comparison
      },
      message: '多位置对比分析完成'
    });
    
  } catch (error) {
    logger.error('多位置对比分析失败:', error);
    res.status(500).json({
      success: false,
      message: '多位置对比分析失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/site-selection/statistics:
 *   get:
 *     summary: 获取选址分析统计信息
 *     tags: [Site Selection]
 *     responses:
 *       200:
 *         description: 统计信息
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    // 基于 candidate_locations 表统计
    const query = `
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN analysis_score IS NOT NULL THEN 1 END) as analyzed_count,
        COUNT(CASE WHEN analysis_score IS NULL THEN 1 END) as pending_count,
        AVG(CASE WHEN analysis_score IS NOT NULL THEN analysis_score END) as avg_score,
        MIN(CASE WHEN analysis_score IS NOT NULL THEN analysis_score END) as min_score,
        MAX(CASE WHEN analysis_score IS NOT NULL THEN analysis_score END) as max_score,
        COUNT(CASE WHEN analysis_score >= 80 THEN 1 END) as excellent_count,
        COUNT(CASE WHEN analysis_score >= 60 AND analysis_score < 80 THEN 1 END) as good_count,
        COUNT(CASE WHEN analysis_score < 60 AND analysis_score IS NOT NULL THEN 1 END) as poor_count,
        COUNT(DISTINCT city) as cities_count,
        COUNT(DISTINCT province) as provinces_count
      FROM candidate_locations
      WHERE ISNULL(delflag, 0) = 0
    `;
    
    const result = await sequelize.query(query, { type: QueryTypes.SELECT });
    const stats = result[0] as any;
    
    // 获取城市分布（基于 candidate_locations）
    const cityQuery = `
      SELECT 
        city,
        COUNT(*) as count,
        COUNT(CASE WHEN analysis_score IS NOT NULL THEN 1 END) as analyzed_count,
        AVG(CASE WHEN analysis_score IS NOT NULL THEN analysis_score END) as avg_score
      FROM candidate_locations
      WHERE ISNULL(delflag, 0) = 0
        AND city IS NOT NULL
      GROUP BY city
      ORDER BY count DESC
    `;
    
    const cityStats = await sequelize.query(cityQuery, { type: QueryTypes.SELECT });
    
    // 格式化统计数据，确保前端兼容
    const overview = {
      total_analyses: stats.total_count || 0,
      total_count: stats.total_count || 0,
      analyzed_count: stats.analyzed_count || 0,
      pending_count: stats.pending_count || 0,
      avg_score: stats.avg_score ? parseFloat(stats.avg_score.toFixed(1)) : 0,
      min_score: stats.min_score || 0,
      max_score: stats.max_score || 0,
      excellent_count: stats.excellent_count || 0,
      good_count: stats.good_count || 0,
      poor_count: stats.poor_count || 0,
      cities_analyzed: stats.cities_count || 0,
      provinces_analyzed: stats.provinces_count || 0
    };
    
    res.json({
      success: true,
      data: {
        overview,
        cityDistribution: cityStats
      },
      message: '获取统计信息成功'
    });
    
  } catch (error: any) {
    logger.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: error.message
    });
  }
});


// 辅助函数：生成对比分析
function generateComparisonAnalysis(results: any[]) {
  const successfulResults = results.filter(r => r.success && r.data);
  
  if (successfulResults.length < 2) {
    return {
      message: '有效分析结果不足，无法进行对比',
      recommendation: null
    };
  }
  
  // 按总分排序
  const sortedResults = successfulResults.sort((a, b) => 
    b.data.scores.overallScore - a.data.scores.overallScore
  );
  
  const best = sortedResults[0];
  const worst = sortedResults[sortedResults.length - 1];
  
  // 分析各维度对比
  const dimensionComparison = {};
  const dimensions = ['poiDensity', 'populationDensity', 'trafficAccessibility', 'competitionLevel', 'rentalCost', 'footTraffic'];
  
  dimensions.forEach(dim => {
    const scores = successfulResults.map(r => r.data.scores[dim]);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    dimensionComparison[dim] = {
      max,
      min,
      avg,
      range: max - min,
      bestLocation: successfulResults.find(r => r.data.scores[dim] === max)?.location,
      worstLocation: successfulResults.find(r => r.data.scores[dim] === min)?.location
    };
  });
  
  // 生成推荐
  const recommendation = {
    bestOverall: best.location,
    bestScore: best.data.scores.overallScore,
    worstOverall: worst.location,
    worstScore: worst.data.scores.overallScore,
    keyInsights: generateKeyInsights(successfulResults),
    dimensionComparison
  };
  
  return recommendation;
}

// 辅助函数：生成关键洞察
function generateKeyInsights(results: any[]) {
  const insights = [];
  
  // 分析总分分布
  const scores = results.map(r => r.data.scores.overallScore);
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  if (avgScore > 70) {
    insights.push('整体选址质量较高，建议优先考虑高分位置');
  } else if (avgScore < 50) {
    insights.push('整体选址质量一般，建议重新评估选址策略');
  }
  
  // 分析竞争环境
  const competitionScores = results.map(r => r.data.scores.competitionLevel);
  const avgCompetition = competitionScores.reduce((sum, score) => sum + score, 0) / competitionScores.length;
  
  if (avgCompetition < 40) {
    insights.push('竞争环境较为激烈，需要差异化定位');
  } else if (avgCompetition > 70) {
    insights.push('竞争环境良好，市场机会较大');
  }
  
  // 分析交通便利性
  const trafficScores = results.map(r => r.data.scores.trafficAccessibility);
  const avgTraffic = trafficScores.reduce((sum, score) => sum + score, 0) / trafficScores.length;
  
  if (avgTraffic < 50) {
    insights.push('交通便利性普遍不足，建议加强外卖配送服务');
  }
  
  return insights;
}

/**
 * @swagger
 * /api/site-selection/candidates:
 *   get:
 *     summary: 获取意向铺位列表
 *     tags: [Site Selection]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: 城市筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 状态筛选
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     records:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           shop_name:
 *                             type: string
 *                           shop_address:
 *                             type: string
 *                           province:
 *                             type: string
 *                           city:
 *                             type: string
 *                           district:
 *                             type: string
 *                           rent_amount:
 *                             type: number
 *                           status:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
function isValidCoordinatePair(lng: number | null, lat: number | null): boolean {
  return typeof lng === 'number' &&
    typeof lat === 'number' &&
    !Number.isNaN(lng) &&
    !Number.isNaN(lat) &&
    lng >= -180 && lng <= 180 &&
    lat >= -90 && lat <= 90;
}

function finalizeCoordinatePair(lngCandidate: number, latCandidate: number): { longitude: number | null; latitude: number | null } {
  if (isValidCoordinatePair(lngCandidate, latCandidate)) {
    return { longitude: lngCandidate, latitude: latCandidate };
  }

  if (isValidCoordinatePair(latCandidate, lngCandidate)) {
    return { longitude: latCandidate, latitude: lngCandidate };
  }

  return { longitude: null, latitude: null };
}

// 解析location字段，提取经纬度
function parseLocation(location: string | null): { longitude: number | null; latitude: number | null } {
  if (!location || typeof location !== 'string') {
    return { longitude: null, latitude: null };
  }
  
  let text = location.trim();
  if (!text) {
    return { longitude: null, latitude: null };
  }

  text = text
    .replace(/POINT\s*\(/i, '')
    .replace(/\)/g, '')
    .replace(/；|;|、|\|/g, ',')
    .replace(/：/g, ':')
    .replace(/\s+/g, ' ');

  const lngMatch = text.match(/(?:lon|lng|经度)\s*[:：]?\s*(-?\d+\.?\d*)/i);
  const latMatch = text.match(/(?:lat|纬度)\s*[:：]?\s*(-?\d+\.?\d*)/i);

  if (lngMatch && latMatch) {
    const lng = parseFloat(lngMatch[1]);
    const lat = parseFloat(latMatch[1]);
    if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
      return finalizeCoordinatePair(lng, lat);
    }
  }

  const numberMatches = text.match(/-?\d+\.?\d*/g);
  if (!numberMatches || numberMatches.length < 2) {
    return { longitude: null, latitude: null };
  }

  const first = parseFloat(numberMatches[0]);
  const second = parseFloat(numberMatches[1]);

  if (Number.isNaN(first) || Number.isNaN(second)) {
    return { longitude: null, latitude: null };
  }

  const lower = text.toLowerCase();
  const firstIndex = lower.indexOf(numberMatches[0]);

  if (firstIndex > -1) {
    const beforeFirst = lower.slice(0, firstIndex);
    const latFirst = /lat|纬/.test(beforeFirst) && !/lon|lng|经/.test(beforeFirst);
    if (latFirst) {
      return finalizeCoordinatePair(second, first);
    }
  }

  return finalizeCoordinatePair(first, second);
}

router.get('/candidates', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const city = req.query.city as string;
    const status = req.query.status as string;
    
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    let whereClause = 'WHERE ISNULL(delflag, 0) = 0';
    const replacements: any = {};

    if (city) {
      // 处理城市名称匹配：支持多种格式灵活匹配
      // 1. 去掉末尾的"市"字："大连市" -> "大连"
      const cityName = city.replace(/市$/, ''); 
      
      // 2. 构建匹配条件：
      // - 首先在 province、city、district 字段中精确/模糊匹配
      // - 如果 city 是"未知"，则在 shop_address 字段中搜索城市名称
      // 这样可以匹配那些地址中有城市名称但 city 字段未正确填充的记录
      whereClause += ` AND (
        province = :city OR city = :city OR district = :city OR
        province = :cityName OR city = :cityName OR district = :cityName OR
        province LIKE :cityPattern OR city LIKE :cityPattern OR district LIKE :cityPattern OR
        province LIKE :cityNamePattern OR city LIKE :cityNamePattern OR district LIKE :cityNamePattern OR
        shop_address LIKE :cityPattern OR shop_address LIKE :cityNamePattern
      )`;
      
      replacements.city = city;
      replacements.cityName = cityName;
      replacements.cityPattern = `%${city}%`;
      replacements.cityNamePattern = `%${cityName}%`;
      
      logger.info(`城市过滤条件: 原始="${city}", 去掉市字="${cityName}"`);
    }

    if (status) {
      whereClause += ' AND status = :status';
      replacements.status = status;
    }

    // 查询数据
    const records = await sequelize.query(`
      SELECT 
        id,
        shop_name,
        shop_address,
        location,
        description,
        province,
        city,
        district,
        rent_amount,
        area_size,
        investment_amount,
        approval_state,
        approval_remarks,
        status,
        analysis_score,
        poi_density_score,
        traffic_score,
        population_score,
        competition_score,
        rental_cost_score,
        predicted_revenue,
        confidence_score,
        success_probability,
        risk_level,
        longitude,
        latitude,
        record_time,
        created_at
      FROM candidate_locations 
      ${whereClause}
      ORDER BY created_at DESC
      OFFSET :offset ROWS
      FETCH NEXT :limit ROWS ONLY
    `, {
      replacements: { ...replacements, offset, limit },
      type: QueryTypes.SELECT
    }) as any[];

    const totalResult = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM candidate_locations 
      ${whereClause}
    `, {
      replacements,
      type: QueryTypes.SELECT
    });

    const total = (totalResult[0] as any).total;

    const normalizedRecords = records.map(record => {
      // 优先使用数据库中的经纬度字段
      let longitude = record.longitude !== null && record.longitude !== undefined 
        ? parseFloat(record.longitude) 
        : null;
      let latitude = record.latitude !== null && record.latitude !== undefined 
        ? parseFloat(record.latitude) 
        : null;

      // 如果经纬度缺失，尝试从 location 字段解析
      if ((longitude === null || latitude === null || isNaN(longitude) || isNaN(latitude)) && record.location) {
        const parsed = parseLocation(record.location);
        if (parsed.longitude !== null && parsed.latitude !== null) {
          longitude = longitude || parsed.longitude;
          latitude = latitude || parsed.latitude;
          
          // 如果成功解析，可以异步更新数据库（可选）
          // 这里不阻塞返回，只是记录日志
          logger.debug(`从 location 字段解析到坐标: ${longitude}, ${latitude} (记录ID: ${record.id})`);
        }
      }

      // 验证坐标有效性
      if (longitude !== null && latitude !== null) {
        if (isNaN(longitude) || isNaN(latitude)) {
          longitude = null;
          latitude = null;
        } else if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
          logger.warn(`无效的坐标范围: ${longitude}, ${latitude} (记录ID: ${record.id})`);
          longitude = null;
          latitude = null;
        }
      }

      return {
        ...record,
        id: record.id?.toString() || '',
        longitude,
        latitude
      };
    });

    // 尝试补充铺位照片（Shop表存在时才会返回）
    const photoMap: Record<string, string> = {};
    try {
      const photoRows = await sequelize.query(`
        SELECT 
          ShopName as shop_name,
          FirstImg as photo_url
        FROM Shop
        WHERE ISNULL(Delflag, 0) = 0
      `, { type: QueryTypes.SELECT });

      (photoRows as any[]).forEach(row => {
        const name = (row as any).shop_name;
        const url = (row as any).photo_url;
        if (name && url) {
          photoMap[String(name).trim()] = url;
        }
      });
    } catch (photoError) {
      logger.warn('Shop表不可用，暂无法补充铺位照片:', photoError instanceof Error ? photoError.message : photoError);
    }

    const finalRecords = normalizedRecords.map(record => ({
      ...record,
      photo_url: photoMap[record.shop_name] || null
    }));
    
    const pages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data: {
        records: finalRecords,
        pagination: {
          page,
          limit,
          total,
          pages
        }
      },
      message: '获取意向铺位列表成功'
    });
  } catch (error: any) {
    logger.error(`获取意向铺位列表失败: ${error.message}`, error);
    res.status(500).json({ success: false, message: `获取意向铺位列表失败: ${error.message}` });
  }
});

/**
 * @swagger
 * /api/site-selection/candidates/{id}/analyze:
 *   post:
 *     summary: 分析指定意向铺位
 *     tags: [Site Selection]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 意向铺位ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               includeMLPrediction:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: 分析成功
 *       404:
 *         description: 意向铺位不存在
 *       500:
 *         description: 分析失败
 */
router.post('/candidates/:id/analyze', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { 
      productType = '高性价比小吃快餐',
      targetCustomers = '价格敏感的年轻群体、追求效率的通勤者、学生和社区家庭'
    } = req.body;
    
    // 获取意向铺位信息
    const candidateResult = await sequelize.query(`
      SELECT 
        id,
        shop_name,
        shop_address,
        location,
        description,
        province,
        city,
        district,
        rent_amount,
        area_size,
        investment_amount,
        longitude,
        latitude
      FROM candidate_locations 
      WHERE id = :id AND ISNULL(delflag, 0) = 0
    `, {
      replacements: { id },
      type: QueryTypes.SELECT
    });
    
    if (candidateResult.length === 0) {
      return res.status(404).json({ success: false, message: '意向铺位不存在' });
    }
    
    const candidate = candidateResult[0] as any;
    
    // 使用大模型进行综合分析
    const aiService = new MultiAIService();
    const aiResponse = await analyzeCandidateWithAI(
      candidate,
      productType,
      targetCustomers,
      aiService
    );
    
    // aiResponse 包含 analysisResult 和 model 信息
    const analysisResult = aiResponse.analysisResult;
    const aiModel = aiResponse.model || 'unknown';
    const rawResponse = aiResponse.rawResponse || '';
    const prompt = aiResponse.prompt || '';
    const apiMetadata = aiResponse.apiMetadata || {};
    
    // 构建解析后的结构化数据（JSON格式）
    const parsedData = JSON.stringify({
      finalScore: analysisResult.finalScore,
      grade: analysisResult.grade,
      strengths: analysisResult.strengths,
      weaknesses: analysisResult.weaknesses,
      opportunities: analysisResult.opportunities,
      threats: analysisResult.threats,
      conclusion: analysisResult.conclusion,
      suggestions: analysisResult.suggestions
    });
    
    // 保存分析历史记录（包含完整数据）
    await sequelize.query(`
      INSERT INTO candidate_analysis_history (
        candidate_id,
        analysis_score,
        description,
        ai_model,
        analysis_type,
        product_type,
        target_customers,
        raw_ai_response,
        prompt,
        parsed_data,
        grade,
        strengths,
        weaknesses,
        opportunities,
        threats,
        conclusion,
        suggestions,
        ai_model_version,
        api_metadata,
        analyzed_at
      ) VALUES (
        :candidate_id,
        :score,
        :description,
        :ai_model,
        'comprehensive',
        :product_type,
        :target_customers,
        :raw_ai_response,
        :prompt,
        :parsed_data,
        :grade,
        :strengths,
        :weaknesses,
        :opportunities,
        :threats,
        :conclusion,
        :suggestions,
        :ai_model_version,
        :api_metadata,
        GETDATE()
      )
    `, {
      replacements: {
        candidate_id: id,
        score: analysisResult.finalScore,
        description: analysisResult.comprehensiveReport,
        ai_model: aiModel,
        product_type: productType,
        target_customers: targetCustomers,
        raw_ai_response: rawResponse,
        prompt: prompt,
        parsed_data: parsedData,
        grade: analysisResult.grade || null,
        strengths: analysisResult.strengths || null,
        weaknesses: analysisResult.weaknesses || null,
        opportunities: analysisResult.opportunities || null,
        threats: analysisResult.threats || null,
        conclusion: analysisResult.conclusion || null,
        suggestions: analysisResult.suggestions || null,
        ai_model_version: aiModel,
        api_metadata: JSON.stringify(apiMetadata)
      },
      type: QueryTypes.INSERT
    });
    
    // 更新意向铺位的最新分析结果（触发器会自动更新，但这里也更新一下确保一致性）
    await sequelize.query(`
      UPDATE candidate_locations 
      SET 
        analysis_score = :score,
        description = :description,
        status = 'analyzed',
        updated_at = GETDATE()
      WHERE id = :id
    `, {
      replacements: {
        id,
        score: analysisResult.finalScore,
        description: analysisResult.comprehensiveReport
      },
      type: QueryTypes.UPDATE
    });
    
    logger.info(`意向铺位 ${id} (${candidate.shop_name}) AI分析完成，得分: ${analysisResult.finalScore}`);
    
    // 将后端格式转换为前端期望的格式
    const frontendAnalysisResult = {
      location: candidate.shop_address || candidate.location || '未知地址',
      coordinates: {
        longitude: candidate.longitude || 0,
        latitude: candidate.latitude || 0
      },
      scores: {
        poiDensity: analysisResult.finalScore * 0.4 || 0,
        populationDensity: analysisResult.finalScore * 0.3 || 0,
        trafficAccessibility: analysisResult.finalScore * 0.15 || 0,
        competitionLevel: 100 - (analysisResult.finalScore * 0.2) || 0,
        rentalCost: analysisResult.finalScore * 0.15 || 0,
        footTraffic: analysisResult.finalScore * 0.4 || 0,
        overallScore: analysisResult.finalScore || 0
      },
      analysis: {
        strengths: analysisResult.strengths ? analysisResult.strengths.split(/[•\n]/).filter(s => s.trim()).map(s => s.trim()) : [],
        weaknesses: analysisResult.weaknesses ? analysisResult.weaknesses.split(/[•\n]/).filter(s => s.trim()).map(s => s.trim()) : [],
        recommendations: analysisResult.suggestions ? analysisResult.suggestions.split(/[•\n]/).filter(s => s.trim()).map(s => s.trim()) : [],
        riskLevel: analysisResult.grade === '优秀' || analysisResult.grade === '良好' ? 'low' : analysisResult.grade === '中等' ? 'medium' : 'high'
      },
      predictions: {
        expectedRevenue: candidate.rent_amount ? candidate.rent_amount * 30 * 2 : 0,
        confidence: analysisResult.finalScore / 100,
        breakEvenTime: candidate.rent_amount ? Math.ceil(candidate.rent_amount / (candidate.rent_amount * 30 * 0.3)) : 12
      },
      data: {
        nearbyPOIs: {},
        schools: {},
        competitors: {},
        trafficStations: []
      }
    };
    
    res.json({
      success: true,
      data: {
        candidate,
        analysis: frontendAnalysisResult,
        analyzedAt: new Date().toISOString()
      },
      message: '意向铺位分析完成'
    });
  } catch (error: any) {
    logger.error(`意向铺位分析失败: ${error.message}`, error);
    res.status(500).json({ success: false, message: `意向铺位分析失败: ${error.message}` });
  }
});

/**
 * @swagger
 * /api/site-selection/{id}:
 *   get:
 *     summary: 获取特定选址分析详情
 *     tags: [Site Selection]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 选址分析记录ID
 *     responses:
 *       200:
 *         description: 选址分析详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const record = await SiteSelection.findByPk(id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: '选址分析记录不存在'
      });
    }
    
    res.json({
      success: true,
      data: record,
      message: '获取选址分析详情成功'
    });
    
  } catch (error) {
    logger.error('获取选址分析详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取选址分析详情失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/site-selection/candidates/batch-analyze:
 *   post:
 *     summary: 批量分析意向铺位
 *     tags: [Site Selection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               candidateIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 意向铺位ID列表
 *               includeMLPrediction:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: 批量分析完成
 */
router.post('/candidates/batch-analyze', async (req: Request, res: Response) => {
  try {
    const { candidateIds, includeMLPrediction = true } = req.body;
    
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ success: false, message: '请提供有效的意向铺位ID列表' });
    }
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    logger.info(`开始批量分析 ${candidateIds.length} 个意向铺位`);
    
    for (const id of candidateIds) {
      try {
        // 获取意向铺位信息
        const candidateResult = await sequelize.query(`
          SELECT 
            id,
            shop_name,
            shop_address,
            location,
            description,
            province,
            city,
            district,
            rent_amount,
            area_size,
            investment_amount
          FROM candidate_locations 
          WHERE id = :id AND delflag = 0
        `, {
          replacements: { id },
          type: QueryTypes.SELECT
        });
        
        if (candidateResult.length === 0) {
          results.push({
            id,
            success: false,
            error: '意向铺位不存在'
          });
          errorCount++;
          continue;
        }
        
        const candidate = candidateResult[0] as any;
        
        // 执行选址分析
        const analysisResult = await EnhancedSiteSelectionService.performSiteAnalysis(
          candidate.shop_address || candidate.location || candidate.shop_name
        );
        
        // 更新意向铺位的分析结果
        await sequelize.query(`
          UPDATE candidate_locations 
          SET 
            analysis_score = :score,
            poi_density_score = :poiScore,
            traffic_score = :trafficScore,
            population_score = :populationScore,
            competition_score = :competitionScore,
            rental_cost_score = :rentalScore,
            predicted_revenue = :predictedRevenue,
            confidence_score = :confidence,
            success_probability = :successProbability,
            risk_level = :riskLevel,
            status = 'analyzed',
            updated_at = GETDATE()
          WHERE id = :id
        `, {
          replacements: {
            id,
            score: analysisResult.scores.overallScore,
            poiScore: analysisResult.scores.poiDensity,
            trafficScore: analysisResult.scores.trafficAccessibility,
            populationScore: analysisResult.scores.populationDensity,
            competitionScore: analysisResult.scores.competitionLevel,
            rentalScore: analysisResult.scores.rentalCost,
            predictedRevenue: analysisResult.predictions?.expectedRevenue,
            confidence: analysisResult.predictions?.confidence,
            successProbability: analysisResult.predictions?.confidence,
            riskLevel: analysisResult.analysis.riskLevel
          },
          type: QueryTypes.UPDATE
        });
        
        results.push({
          id,
          success: true,
          candidate: candidate,
          analysis: analysisResult
        });
        successCount++;
        
        logger.info(`意向铺位 ${id} 分析完成`);
        
      } catch (error: any) {
        logger.error(`意向铺位 ${id} 分析失败: ${error.message}`);
        results.push({
          id,
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }
    
    logger.info(`批量分析完成: 成功 ${successCount} 个，失败 ${errorCount} 个`);
    
    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: candidateIds.length,
          success: successCount,
          failed: errorCount,
          successRate: (successCount / candidateIds.length * 100).toFixed(1)
        }
      },
      message: `批量分析完成: 成功 ${successCount} 个，失败 ${errorCount} 个`
    });
  } catch (error: any) {
    logger.error(`批量分析失败: ${error.message}`, error);
    res.status(500).json({ success: false, message: `批量分析失败: ${error.message}` });
  }
});

/**
 * @swagger
 * /api/site-selection/candidates/comprehensive-analysis:
 *   post:
 *     summary: 批量综合分析意向铺位（使用大模型）
 *     tags: [Site Selection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - candidateIds
 *             properties:
 *               candidateIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 意向铺位ID列表
 *               productType:
 *                 type: string
 *                 description: 产品类型，例如：高性价比小吃快餐
 *                 default: 高性价比小吃快餐
 *               targetCustomers:
 *                 type: string
 *                 description: 目标客户定位
 *                 default: 价格敏感的年轻群体、追求效率的通勤者、学生和社区家庭
 *     responses:
 *       200:
 *         description: 综合分析完成
 */
router.post('/candidates/comprehensive-analysis', async (req: Request, res: Response) => {
  try {
    const { 
      candidateIds, 
      productType = '高性价比小吃快餐',
      targetCustomers = '价格敏感的年轻群体、追求效率的通勤者、学生和社区家庭'
    } = req.body;
    
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ success: false, message: '请提供有效的意向铺位ID列表' });
    }
    
    logger.info(`开始批量综合分析 ${candidateIds.length} 个意向铺位（使用大模型）`);
    
    // 获取所有意向铺位信息
    const candidatesResult = await sequelize.query(`
      SELECT 
        id,
        shop_name,
        shop_address,
        location,
        description,
        province,
        city,
        district,
        longitude,
        latitude,
        rent_amount,
        area_size
      FROM candidate_locations 
      WHERE id IN (${candidateIds.map((_: any, i: number) => `:id${i}`).join(',')})
        AND ISNULL(delflag, 0) = 0
    `, {
      replacements: Object.fromEntries(candidateIds.map((id: number, i: number) => [`id${i}`, id])),
      type: QueryTypes.SELECT
    });
    
    if (candidatesResult.length === 0) {
      return res.status(404).json({ success: false, message: '未找到指定的意向铺位' });
    }
    
    const candidates = candidatesResult as any[];
    
    // 使用大模型服务
    const aiService = new MultiAIService();
    
    // 为每个铺位生成综合分析
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    // 限制并发数，避免API调用过于频繁
    const BATCH_SIZE = 3;
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (candidate) => {
        try {
          const aiResponse = await analyzeCandidateWithAI(
            candidate,
            productType,
            targetCustomers,
            aiService
          );
        
        const analysisResult = aiResponse.analysisResult;
        const aiModel = aiResponse.model || 'unknown';
        const rawResponse = aiResponse.rawResponse || '';
        const prompt = aiResponse.prompt || '';
        const apiMetadata = aiResponse.apiMetadata || {};
        
        // 构建解析后的结构化数据（JSON格式）
        const parsedData = JSON.stringify({
          finalScore: analysisResult.finalScore,
          grade: analysisResult.grade,
          strengths: analysisResult.strengths,
          weaknesses: analysisResult.weaknesses,
          opportunities: analysisResult.opportunities,
          threats: analysisResult.threats,
          conclusion: analysisResult.conclusion,
          suggestions: analysisResult.suggestions
        });
        
        // 保存分析历史记录（包含完整数据）
        await sequelize.query(`
          INSERT INTO candidate_analysis_history (
            candidate_id,
            analysis_score,
            description,
            ai_model,
            analysis_type,
            product_type,
            target_customers,
            raw_ai_response,
            prompt,
            parsed_data,
            grade,
            strengths,
            weaknesses,
            opportunities,
            threats,
            conclusion,
            suggestions,
            ai_model_version,
            api_metadata,
            analyzed_at
          ) VALUES (
            :candidate_id,
            :score,
            :description,
            :ai_model,
            'comprehensive',
            :product_type,
            :target_customers,
            :raw_ai_response,
            :prompt,
            :parsed_data,
            :grade,
            :strengths,
            :weaknesses,
            :opportunities,
            :threats,
            :conclusion,
            :suggestions,
            :ai_model_version,
            :api_metadata,
            GETDATE()
          )
        `, {
          replacements: {
            candidate_id: candidate.id,
            score: analysisResult.finalScore,
            description: analysisResult.comprehensiveReport,
            ai_model: aiModel,
            product_type: productType,
            target_customers: targetCustomers,
            raw_ai_response: rawResponse,
            prompt: prompt,
            parsed_data: parsedData,
            grade: analysisResult.grade || null,
            strengths: analysisResult.strengths || null,
            weaknesses: analysisResult.weaknesses || null,
            opportunities: analysisResult.opportunities || null,
            threats: analysisResult.threats || null,
            conclusion: analysisResult.conclusion || null,
            suggestions: analysisResult.suggestions || null,
            ai_model_version: aiModel,
            api_metadata: JSON.stringify(apiMetadata)
          },
          type: QueryTypes.INSERT
        });
        
        // 更新意向铺位的最新分析结果
        await sequelize.query(`
          UPDATE candidate_locations 
          SET 
            analysis_score = :score,
            description = :description,
            status = 'analyzed',
            updated_at = GETDATE()
          WHERE id = :id
        `, {
          replacements: {
            id: candidate.id,
            score: analysisResult.finalScore,
            description: analysisResult.comprehensiveReport
          },
          type: QueryTypes.UPDATE
        });
        
        // 转换为前端期望的格式
        const frontendAnalysisResult = {
          location: candidate.shop_address || candidate.location || '未知地址',
          coordinates: {
            longitude: candidate.longitude || 0,
            latitude: candidate.latitude || 0
          },
          scores: {
            poiDensity: analysisResult.finalScore * 0.4 || 0,
            populationDensity: analysisResult.finalScore * 0.3 || 0,
            trafficAccessibility: analysisResult.finalScore * 0.15 || 0,
            competitionLevel: 100 - (analysisResult.finalScore * 0.2) || 0,
            rentalCost: analysisResult.finalScore * 0.15 || 0,
            footTraffic: analysisResult.finalScore * 0.4 || 0,
            overallScore: analysisResult.finalScore || 0
          },
          analysis: {
            strengths: analysisResult.strengths ? analysisResult.strengths.split(/[•\n]/).filter((s: string) => s.trim()).map((s: string) => s.trim()) : [],
            weaknesses: analysisResult.weaknesses ? analysisResult.weaknesses.split(/[•\n]/).filter((s: string) => s.trim()).map((s: string) => s.trim()) : [],
            recommendations: analysisResult.suggestions ? analysisResult.suggestions.split(/[•\n]/).filter((s: string) => s.trim()).map((s: string) => s.trim()) : [],
            riskLevel: analysisResult.grade === '优秀' || analysisResult.grade === '良好' ? 'low' : analysisResult.grade === '中等' ? 'medium' : 'high'
          },
          predictions: {
            expectedRevenue: candidate.rent_amount ? candidate.rent_amount * 30 * 2 : 0,
            confidence: analysisResult.finalScore / 100,
            breakEvenTime: candidate.rent_amount ? Math.ceil(candidate.rent_amount / (candidate.rent_amount * 30 * 0.3)) : 12
          },
          data: {
            nearbyPOIs: {},
            schools: {},
            competitors: {},
            trafficStations: []
          }
        };
        
        results.push({
          id: candidate.id,
          success: true,
          candidate: {
            shop_name: candidate.shop_name,
            shop_address: candidate.shop_address
          },
          analysis: frontendAnalysisResult
        });
        successCount++;
        
        logger.info(`意向铺位 ${candidate.id} (${candidate.shop_name}) 综合分析完成`);
          
        } catch (error: any) {
          logger.error(`意向铺位 ${candidate.id} 综合分析失败: ${error.message}`, error);
          results.push({
            id: candidate.id,
            success: false,
            error: error.message
          });
          errorCount++;
        }
      }));
      
      // 批次间稍作延迟，避免API限流
      if (i + BATCH_SIZE < candidates.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    logger.info(`批量综合分析完成: 成功 ${successCount} 个，失败 ${errorCount} 个`);
    
    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: candidateIds.length,
          success: successCount,
          failed: errorCount,
          successRate: (successCount / candidateIds.length * 100).toFixed(1)
        }
      },
      message: `批量综合分析完成: 成功 ${successCount} 个，失败 ${errorCount} 个`
    });
    
  } catch (error: any) {
    logger.error(`批量综合分析失败: ${error.message}`, error);
    res.status(500).json({ success: false, message: `批量综合分析失败: ${error.message}` });
  }
});

// 使用大模型分析单个铺位的辅助函数
async function analyzeCandidateWithAI(
  candidate: any,
  productType: string,
  targetCustomers: string,
  aiService: any
): Promise<{ 
  analysisResult: any; 
  model: string;
  rawResponse: string;
  prompt: string;
  apiMetadata?: any;
}> {
  // 构建分析提示词（基于用户提供的模板）
  const prompt = buildAnalysisPrompt(candidate, productType, targetCustomers);
  const systemPrompt = '你是一位专业的餐饮选址顾问和市场分析师，擅长评估铺位的商业价值和风险。请严格按照用户要求的格式输出分析结果。';
  
  try {
    const startTime = Date.now();
    const response = await aiService.chatCompletion([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 60000
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    // 解析AI返回的分析结果
    const result = parseAnalysisResponse(response.content, candidate);
    
    // 构建API元数据
    const apiMetadata = {
      responseTime,
      model: response.model,
      timestamp: new Date().toISOString(),
      tokensUsed: response.usage?.total_tokens || null,
      promptTokens: response.usage?.prompt_tokens || null,
      completionTokens: response.usage?.completion_tokens || null
    };
    
    return {
      analysisResult: result,
      model: response.model,
      rawResponse: response.content,
      prompt: `${systemPrompt}\n\n${prompt}`,
      apiMetadata
    };
    
  } catch (error: any) {
    logger.error(`AI分析失败: ${error.message}`, error);
    throw new Error(`AI分析失败: ${error.message}`);
  }
}

// 构建分析提示词
function buildAnalysisPrompt(candidate: any, productType: string, targetCustomers: string): string {
  const address = candidate.shop_address || candidate.location || '未知地址';
  const coordinates = candidate.longitude && candidate.latitude 
    ? `经纬度：${candidate.longitude}, ${candidate.latitude}`
    : '坐标信息：未提供';
  const sceneDescription = candidate.description || '位于商业区域';
  const rentInfo = candidate.rent_amount ? `¥${candidate.rent_amount}/月` : '未提供';
  
  // 使用优化后的提示词模板
  return `**核心任务：** 为"咬一口纯佑热狗"项目评估铺位选址的商业可行性

**输入数据：**

1. **铺位基本信息：** ${address}，${coordinates}

2. **分析半径：** 主分析半径500米，延伸观察1公里

3. **场景特征：** ${sceneDescription}

4. **目标客群：** ${targetCustomers}

5. **租金成本：** ${rentInfo}

6. **历史经营参考（可选）：** 无相关数据

**深度分析维度：**

### 1. 客群匹配度分析（权重35%）

- **办公人群密度：** 周边写字楼、产业园的分布及午间人流峰值

- **学生群体规模：** 初中以上学校分布及放学时段流量

- **游客/流动人口：** 交通枢纽、景点周边的过路客群特征

- **社区居民：** 周边住宅区人口密度及消费习惯匹配度

### 2. 流量质量评估（权重30%）

- **高峰时段：** 早午晚三餐及夜宵时段的自然流量

- **流量目的：** 工作通勤、购物休闲、专程消费的比例预估

- **停留时长：** 客群在该区域的典型停留时间

### 3. 竞争环境分析（权重20%）

- **直接竞争：** 200米内同类西式快餐、热狗店的数量和定价

- **间接竞争：** 便利店、面包店、其他小吃店的替代性竞争

- **互补业态：** 饮品店、甜品店等可形成消费组合的商户

### 4. 位置可见性与便利性（权重15%）

- **临街效果：** 主街/辅街、转角位、昭示性评分

- **交通可达：** 地铁站、公交站、停车场的步行距离

- **自然流量：** 是否处于人流主动线

**风险评估要素：**

- 季节性波动风险（学校寒暑假、节假日影响）

- 施工围挡等临时性障碍

- 周边业态调整风险

- 租金成本占预估营收比例

**输出格式要求：**

## 咬一口纯佑热狗选址分析报告

**一、综合评分**

- **最终得分：** [85/100]

- **风险等级：** [低风险｜中等风险｜高风险]

- **回本周期预估：** [基于租金和客单价估算]

**二、客群匹配详情**

- **核心客群匹配度：** [高/中/低]

- **潜在客群规模：** [估算日均目标客流量]

- **消费时段分布预测：** [早/午/晚/夜宵占比]

**三、竞争态势分析**

- **市场竞争压力：** [激烈/中等/宽松]

- **差异化机会点：** [产品、价格、服务等方面的突破机会]

- **建议定价区间：** [基于周边消费水平]

**四、SWOT分析**

- **优势：** [3-4条具体优势]

- **劣势：** [需要重点关注和改进的方面]

- **机会：** [可挖掘的增长机会]

- **威胁：** [需要规避的风险]

**五、具体运营建议**

1. **营业时间建议：** [基于客流特征]

2. **产品结构优化：** [主打产品和搭配建议]

3. **促销策略：** [开业期和长期促销方案]

4. **风险应对预案：** [针对识别风险的应对措施]

**六、数据可信度说明**

- [明确标注哪些分析基于可靠数据，哪些基于合理推测]`;
}

// 解析AI返回的分析结果
function parseAnalysisResponse(aiResponse: string, candidate: any): any {
  try {
    // 尝试多种方式提取评分
    let score: number | null = null;
    
    // 方式1: "**最终得分：** XX / 100" (Markdown格式)
    const scoreMatch1 = aiResponse.match(/\*\*最终得分[：:]\*\*\s*(\d+(?:\.\d+)?)\s*\/\s*100/);
    if (scoreMatch1) {
      score = parseFloat(scoreMatch1[1]);
      logger.info(`方式1匹配成功: 最终得分 = ${score}`);
    }
    
    // 方式2: "最终得分：XX / 100" (普通格式)
    if (score === null || isNaN(score)) {
      const scoreMatch2 = aiResponse.match(/最终得分[：:]\s*(\d+(?:\.\d+)?)\s*\/\s*100/);
      if (scoreMatch2) {
        score = parseFloat(scoreMatch2[1]);
        logger.info(`方式2匹配成功: 最终得分 = ${score}`);
      }
    }
    
    // 方式3: "**最终得分：** XX" (Markdown格式，没有"/100")
    if (score === null || isNaN(score)) {
      const scoreMatch3 = aiResponse.match(/\*\*最终得分[：:]\*\*\s*(\d+(?:\.\d+)?)/);
      if (scoreMatch3) {
        const parsed = parseFloat(scoreMatch3[1]);
        if (parsed >= 0 && parsed <= 100) {
          score = parsed;
          logger.info(`方式3匹配成功: 最终得分 = ${score}`);
        }
      }
    }
    
    // 方式4: "最终得分：XX" (普通格式，没有"/100")
    if (score === null || isNaN(score)) {
      const scoreMatch4 = aiResponse.match(/最终得分[：:]\s*(\d+(?:\.\d+)?)/);
      if (scoreMatch4) {
        const parsed = parseFloat(scoreMatch4[1]);
        if (parsed >= 0 && parsed <= 100) {
          score = parsed;
          logger.info(`方式4匹配成功: 最终得分 = ${score}`);
        }
      }
    }
    
    // 方式3: "得分：XX分"
    if (score === null || isNaN(score)) {
      const scoreMatch3 = aiResponse.match(/得分[：:]\s*(\d+(?:\.\d+)?)\s*分/);
      if (scoreMatch3) {
        const parsed = parseFloat(scoreMatch3[1]);
        if (parsed >= 0 && parsed <= 100) {
          score = parsed;
          logger.info(`方式3匹配成功: 得分 = ${score}`);
        }
      }
    }
    
    // 方式4: "评分：XX"
    if (score === null || isNaN(score)) {
      const scoreMatch4 = aiResponse.match(/评分[：:]\s*(\d+(?:\.\d+)?)/);
      if (scoreMatch4) {
        const parsed = parseFloat(scoreMatch4[1]);
        if (parsed >= 0 && parsed <= 100) {
          score = parsed;
          logger.info(`方式4匹配成功: 评分 = ${score}`);
        }
      }
    }
    
    // 如果还是没有找到，在"最终得分"或"得分"附近查找数字
    if (score === null || isNaN(score)) {
      const scoreSection = aiResponse.match(/最终得分[：:][\s\S]{0,200}/);
      if (scoreSection) {
        const numberMatch = scoreSection[0].match(/\b(\d{1,2}(?:\.\d+)?)\b/);
        if (numberMatch) {
          const parsed = parseFloat(numberMatch[1]);
          if (parsed >= 0 && parsed <= 100 && parsed >= 10) {
            score = parsed;
            logger.info(`方式5匹配成功: 在得分附近找到 = ${score}`);
          }
        }
      }
    }
    
    logger.info(`解析评分结果: 原始文本长度=${aiResponse.length}, 提取的分数=${score !== null && !isNaN(score) ? score : '未找到'}`);
    
    // 提取风险等级（新格式）
    let riskLevel = '';
    const riskLevelMatch = aiResponse.match(/风险等级[：:]\s*([低中高风险]+风险)/);
    if (riskLevelMatch) {
      riskLevel = riskLevelMatch[1];
    } else {
      // 如果没有找到，根据评分推断
      riskLevel = score !== null && score >= 85 ? '低风险' : score !== null && score >= 70 ? '中等风险' : score !== null && score >= 50 ? '中等风险' : '高风险';
    }
    
    // 提取回本周期（新格式）
    let paybackPeriod = '';
    const paybackMatch = aiResponse.match(/回本周期预估[：:]([\s\S]*?)(?=\*\*二|$)/);
    if (paybackMatch) {
      paybackPeriod = paybackMatch[1].trim();
    }
    
    // 提取客群匹配详情（新格式）
    let customerMatch = '';
    let customerScale = '';
    let timeDistribution = '';
    const customerMatchMatch = aiResponse.match(/核心客群匹配度[：:]\s*([高中低])/);
    if (customerMatchMatch) {
      customerMatch = customerMatchMatch[1];
    }
    const scaleMatch = aiResponse.match(/潜在客群规模[：:]([\s\S]*?)(?=消费时段|$)/);
    if (scaleMatch) {
      customerScale = scaleMatch[1].trim();
    }
    const timeMatch = aiResponse.match(/消费时段分布预测[：:]([\s\S]*?)(?=\*\*三|$)/);
    if (timeMatch) {
      timeDistribution = timeMatch[1].trim();
    }
    
    // 提取竞争态势分析（新格式）
    let competitionPressure = '';
    let differentiation = '';
    let pricingRange = '';
    const pressureMatch = aiResponse.match(/市场竞争压力[：:]\s*([激烈中等宽松]+)/);
    if (pressureMatch) {
      competitionPressure = pressureMatch[1];
    }
    const diffMatch = aiResponse.match(/差异化机会点[：:]([\s\S]*?)(?=建议定价|$)/);
    if (diffMatch) {
      differentiation = diffMatch[1].trim();
    }
    const priceMatch = aiResponse.match(/建议定价区间[：:]([\s\S]*?)(?=\*\*四|$)/);
    if (priceMatch) {
      pricingRange = priceMatch[1].trim();
    }
    
    // 提取其他结构化信息（SWOT，兼容新旧格式）
    const strengthsMatch = aiResponse.match(/优势[（(]Strengths[）)]?[：:]([\s\S]*?)(?=劣势|$)/i) || aiResponse.match(/优势[：:]([\s\S]*?)(?=劣势|$)/i);
    const weaknessesMatch = aiResponse.match(/劣势[（(]Weaknesses[）)]?[：:]([\s\S]*?)(?=机会|$)/i) || aiResponse.match(/劣势[：:]([\s\S]*?)(?=机会|$)/i);
    const opportunitiesMatch = aiResponse.match(/机会[（(]Opportunities[）)]?[：:]([\s\S]*?)(?=威胁|$)/i) || aiResponse.match(/机会[：:]([\s\S]*?)(?=威胁|$)/i);
    const threatsMatch = aiResponse.match(/威胁[（(]Threats[）)]?[：:]([\s\S]*?)(?=具体运营建议|运营建议|最终结论|结论|$)/i) || aiResponse.match(/威胁[：:]([\s\S]*?)(?=具体运营建议|运营建议|最终结论|结论|$)/i);
    
    // 提取运营建议（新格式，更详细）
    let operationSuggestions = '';
    const suggestionsMatch = aiResponse.match(/具体运营建议[\s\S]*?(?=数据可信度|$)/);
    if (suggestionsMatch) {
      operationSuggestions = suggestionsMatch[0].trim();
    } else {
      // 如果没有找到，尝试旧格式
      const oldSuggestionsMatch = aiResponse.match(/运营建议[：:]([\s\S]*?)$/);
      if (oldSuggestionsMatch) {
        operationSuggestions = oldSuggestionsMatch[1].trim();
      }
    }
    
    // 提取结论
    let conclusion = '';
    const conclusionMatch = aiResponse.match(/结论[：:]([\s\S]*?)(?=运营建议|$)/);
    if (conclusionMatch) {
      conclusion = conclusionMatch[1].trim();
    }
    
    // 提取数据可信度说明（新格式）
    let dataCredibility = '';
    const credibilityMatch = aiResponse.match(/数据可信度说明[\s\S]*?-?\s*([\s\S]*?)$/);
    if (credibilityMatch) {
      dataCredibility = credibilityMatch[1].trim();
    }
    
    // 确定评分等级（兼容新旧格式）
    let grade = '';
    if (score !== null) {
      if (score >= 85) grade = '优秀';
      else if (score >= 70) grade = '良好';
      else if (score >= 50) grade = '中等';
      else grade = '风险高';
    } else {
      grade = '未知';
    }
    
    return {
      finalScore: score || 0,
      grade: grade,
      riskLevel: riskLevel,
      paybackPeriod: paybackPeriod,
      customerMatch: customerMatch,
      customerScale: customerScale,
      timeDistribution: timeDistribution,
      competitionPressure: competitionPressure,
      differentiation: differentiation,
      pricingRange: pricingRange,
      strengths: strengthsMatch ? strengthsMatch[1].trim() : '',
      weaknesses: weaknessesMatch ? weaknessesMatch[1].trim() : '',
      opportunities: opportunitiesMatch ? opportunitiesMatch[1].trim() : '',
      threats: threatsMatch ? threatsMatch[1].trim() : '',
      conclusion: conclusion,
      suggestions: operationSuggestions || '',
      dataCredibility: dataCredibility,
      comprehensiveReport: aiResponse
    };
  } catch (error) {
    logger.warn('解析AI响应失败，使用原始响应', error);
    return {
      finalScore: 0,
      grade: '未知',
      comprehensiveReport: aiResponse
    };
  }
}

/**
 * @swagger
 * /api/site-selection/candidates/{id}/export:
 *   get:
 *     summary: 导出铺位分析报告（PDF或Word）
 *     tags: [Site Selection]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 意向铺位ID
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pdf, word]
 *         description: 导出格式（pdf或word）
 *     responses:
 *       200:
 *         description: 导出成功，返回文件流
 *       404:
 *         description: 意向铺位不存在
 *       500:
 *         description: 导出失败
 */
router.get('/candidates/:id/export', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const format = req.query.format as string || 'pdf';
    
    if (!['pdf', 'word'].includes(format)) {
      return res.status(400).json({ success: false, message: '导出格式必须是pdf或word' });
    }
    
    // 获取意向铺位信息
    const candidateResult = await sequelize.query(`
      SELECT 
        id,
        shop_name,
        shop_address,
        location,
        description,
        province,
        city,
        district,
        longitude,
        latitude,
        rent_amount,
        area_size,
        analysis_score,
        updated_at
      FROM candidate_locations 
      WHERE id = :id AND ISNULL(delflag, 0) = 0
    `, {
      replacements: { id },
      type: QueryTypes.SELECT
    });
    
    if (candidateResult.length === 0) {
      return res.status(404).json({ success: false, message: '意向铺位不存在' });
    }
    
    const candidate = candidateResult[0] as any;
    
    // 检查是否有分析结果
    if (!candidate.analysis_score && !candidate.description) {
      return res.status(400).json({ success: false, message: '该铺位尚未进行分析，无法导出报告' });
    }
    
    // 导入导出服务
    const { generatePDFReport, generateWordReport } = await import('../services/ReportExportService');
    
    const reportData = {
      id: candidate.id,
      shop_name: candidate.shop_name,
      shop_address: candidate.shop_address,
      province: candidate.province,
      city: candidate.city,
      district: candidate.district,
      rent_amount: candidate.rent_amount,
      analysis_score: candidate.analysis_score,
      description: candidate.description,
      longitude: candidate.longitude,
      latitude: candidate.latitude,
      updated_at: candidate.updated_at
    };
    
    let fileBuffer: Buffer;
    let mimeType: string;
    let fileExtension: string;
    
    if (format === 'pdf') {
      fileBuffer = await generatePDFReport(reportData);
      mimeType = 'application/pdf';
      fileExtension = 'pdf';
    } else {
      fileBuffer = await generateWordReport(reportData);
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      fileExtension = 'docx';
    }
    
    // 生成文件名（去除特殊字符）
    const sanitizedName = (candidate.shop_name || '铺位').replace(/[<>:"/\\|?*]/g, '_');
    const fileName = `${sanitizedName}_分析报告_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
    
    // 设置响应头
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', fileBuffer.length.toString());
    
    // 发送文件
    res.send(fileBuffer);
    
    logger.info(`成功导出铺位分析报告: ID=${id}, 格式=${format}`);
    
  } catch (error: any) {
    logger.error(`导出铺位分析报告失败: ${error.message}`, error);
    res.status(500).json({ success: false, message: `导出失败: ${error.message}` });
  }
});

/**
 * @swagger
 * /api/site-selection/candidates/{id}/analysis-history:
 *   get:
 *     summary: 获取铺位的分析历史记录
 *     tags: [Site Selection]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 意向铺位ID
 *     responses:
 *       200:
 *         description: 分析历史记录列表
 *       404:
 *         description: 意向铺位不存在
 */
router.get('/candidates/:id/analysis-history', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // 检查铺位是否存在
    const candidateResult = await sequelize.query(`
      SELECT id, shop_name 
      FROM candidate_locations 
      WHERE id = :id AND ISNULL(delflag, 0) = 0
    `, {
      replacements: { id },
      type: QueryTypes.SELECT
    });
    
    if (candidateResult.length === 0) {
      return res.status(404).json({ success: false, message: '意向铺位不存在' });
    }
    
    // 获取分析历史记录
    const historyResult = await sequelize.query(`
      SELECT 
        id,
        analysis_score,
        description,
        ai_model,
        analysis_type,
        product_type,
        target_customers,
        analyzed_at,
        created_at
      FROM candidate_analysis_history
      WHERE candidate_id = :id AND ISNULL(delflag, 0) = 0
      ORDER BY analyzed_at DESC
    `, {
      replacements: { id },
      type: QueryTypes.SELECT
    });
    
    res.json({
      success: true,
      data: {
        candidate: candidateResult[0],
        history: historyResult
      }
    });
    
  } catch (error: any) {
    logger.error(`获取分析历史失败: ${error.message}`, error);
    res.status(500).json({ success: false, message: `获取分析历史失败: ${error.message}` });
  }
});

/**
 * @swagger
 * /api/site-selection/demo/market-potential:
 *   post:
 *     summary: 获取市场潜力统计数据（用于演示页面）
 *     tags: [Site Selection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               city:
 *                 type: string
 *               district:
 *                 type: string
 *               minStudentCount:
 *                 type: number
 *               businessDensity:
 *                 type: string
 *               coordinates:
 *                 type: array
 *                 description: 地图圈选区域的坐标点
 *     responses:
 *       200:
 *         description: 市场潜力统计数据
 */
router.post('/demo/market-potential', async (req: Request, res: Response) => {
  try {
    const { city, district, minStudentCount = 0, businessDensity, coordinates } = req.body;

    logger.info(`市场潜力分析请求: city="${city}", district="${district}", minStudentCount=${minStudentCount}`);

    // 构建查询条件（支持模糊匹配城市名称）
    let whereClause = 'WHERE ISNULL(s.delflag, 0) = 0';
    const params: any = {};

    if (city) {
      // 支持城市名称的模糊匹配（如"天津市"和"天津"都能匹配）
      const cityName = city.replace(/市$/, ''); // 去掉"市"字
      whereClause += ` AND (
        s.city = :city OR 
        s.city = :cityName OR 
        s.city LIKE :cityPattern OR
        s.city LIKE :cityNamePattern
      )`;
      params.city = city;
      params.cityName = cityName;
      params.cityPattern = `%${city}%`;
      params.cityNamePattern = `%${cityName}%`;
      logger.info(`城市过滤条件: 原始="${city}", 去掉市字="${cityName}"`);
    }
    if (district) {
      // 支持区县名称的模糊匹配
      const districtName = district.replace(/区$|县$|市$/, '');
      whereClause += ` AND (
        s.district = :district OR 
        s.district = :districtName OR
        s.district LIKE :districtPattern OR
        s.district LIKE :districtNamePattern
      )`;
      params.district = district;
      params.districtName = districtName;
      params.districtPattern = `%${district}%`;
      params.districtNamePattern = `%${districtName}%`;
      logger.info(`区县过滤条件: 原始="${district}", 去掉后缀="${districtName}"`);
    }
    if (minStudentCount) {
      whereClause += ' AND s.student_count >= :minStudentCount';
      params.minStudentCount = minStudentCount;
    }

    // 获取学校数据
    const schoolQuery = `
      SELECT 
        s.id,
        s.school_name,
        s.school_type,
        s.latitude,
        s.longitude,
        s.student_count,
        s.province,
        s.city,
        s.district,
        s.address
      FROM hotdog2030.dbo.school_basic_info s
      ${whereClause}
      ORDER BY s.student_count DESC
    `;

    logger.info(`执行查询: ${schoolQuery}`);
    logger.info(`查询参数:`, JSON.stringify(params, null, 2));

    let schools = await sequelize.query(schoolQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    }) as any[];

    logger.info(`查询到 ${schools.length} 所学校（过滤坐标前）`);

    // 分离有坐标和没有坐标的学校
    const schoolsWithCoords = schools.filter(s => s.latitude && s.longitude);
    const schoolsWithoutCoords = schools.filter(s => !s.latitude || !s.longitude);
    
    if (schoolsWithoutCoords.length > 0) {
      logger.warn(`${schoolsWithoutCoords.length} 所学校缺少坐标数据（无法在地图上显示）`);
      // 显示前5所没有坐标的学校作为示例
      logger.warn('缺少坐标的学校示例:', schoolsWithoutCoords.slice(0, 5).map(s => ({
        id: s.id,
        name: s.school_name,
        city: s.city,
        district: s.district
      })));
    }
    
    logger.info(`其中有坐标的学校: ${schoolsWithCoords.length} 所`);
    
    // 返回所有学校数据，前端可以选择只显示有坐标的
    // 注意：地图上只会显示有坐标的学校
    schools = schools; // 保留所有学校，不强制过滤坐标

    // 如果指定了坐标范围，筛选出范围内的学校
    if (coordinates && Array.isArray(coordinates) && coordinates.length > 0) {
      // 简单的边界框过滤（可以后续优化为多边形内判断）
      const bounds = coordinates.reduce((acc: any, coord: any) => {
        if (!acc.minLng) {
          acc.minLng = coord.lng;
          acc.maxLng = coord.lng;
          acc.minLat = coord.lat;
          acc.maxLat = coord.lat;
        } else {
          acc.minLng = Math.min(acc.minLng, coord.lng);
          acc.maxLng = Math.max(acc.maxLng, coord.lng);
          acc.minLat = Math.min(acc.minLat, coord.lat);
          acc.maxLat = Math.max(acc.maxLat, coord.lat);
        }
        return acc;
      }, {});

      schools = schools.filter((school: any) => {
        return school.longitude >= bounds.minLng &&
               school.longitude <= bounds.maxLng &&
               school.latitude >= bounds.minLat &&
               school.latitude <= bounds.maxLat;
      });
    }

    // 计算统计数据
    const totalStudents = schools.reduce((sum: number, school: any) => sum + (school.student_count || 0), 0);
    const schoolCount = schools.length;
    const avgStudentsPerSchool = schoolCount > 0 ? Math.round(totalStudents / schoolCount) : 0;

    // 按区县聚合
    const districtStats: any = {};
    schools.forEach((school: any) => {
      const key = `${school.city}-${school.district}`;
      if (!districtStats[key]) {
        districtStats[key] = {
          city: school.city,
          district: school.district,
          schoolCount: 0,
          studentCount: 0,
          schools: []
        };
      }
      districtStats[key].schoolCount++;
      districtStats[key].studentCount += school.student_count || 0;
      districtStats[key].schools.push({
        id: school.id,
        name: school.school_name,
        type: school.school_type,
        students: school.student_count,
        location: [school.longitude, school.latitude]
      });
    });

    // 计算潜力评分（基于学生数量、学校数量等）
    let potentialScore = 0;
    let scoreDetails: any = {};

    // 学生数量评分（0-40分）
    const studentScore = Math.min(40, (totalStudents / 50000) * 40);
    scoreDetails.studentScore = studentScore;

    // 学校密度评分（0-30分）
    const schoolDensityScore = Math.min(30, (schoolCount / 50) * 30);
    scoreDetails.schoolDensityScore = schoolDensityScore;

    // 区域覆盖评分（0-30分）
    const districtCoverageScore = Math.min(30, Object.keys(districtStats).length * 5);
    scoreDetails.districtCoverageScore = districtCoverageScore;

    potentialScore = Math.round(studentScore + schoolDensityScore + districtCoverageScore);

    // 获取商业数据（从candidate_locations表）
    let businessQuery = 'SELECT COUNT(*) as count FROM hotdog2030.dbo.candidate_locations WHERE delflag = 0';
    if (city) {
      businessQuery += ' AND city = :city';
    }
    if (district) {
      businessQuery += ' AND district = :district';
    }

    const businessResult = await sequelize.query(businessQuery, {
      type: QueryTypes.SELECT,
      replacements: params,
    }) as any[];

    const businessCount = businessResult[0]?.count || 0;

    // 确定潜力等级
    let potentialLevel = 'C';
    if (potentialScore >= 80) potentialLevel = 'A+';
    else if (potentialScore >= 70) potentialLevel = 'A';
    else if (potentialScore >= 60) potentialLevel = 'B+';
    else if (potentialScore >= 50) potentialLevel = 'B';
    else if (potentialScore >= 40) potentialLevel = 'C+';

    res.json({
      success: true,
      data: {
        statistics: {
          totalStudents,
          schoolCount,
          avgStudentsPerSchool,
          businessCount,
          districtCount: Object.keys(districtStats).length
        },
        potentialScore,
        potentialLevel,
        scoreDetails,
        districtStats: Object.values(districtStats),
        schools: schools.slice(0, 500), // 限制返回数量，避免数据过大
        // 调试信息
        debug: {
          queryConditions: { city, district, minStudentCount },
          totalFound: schools.length,
          schoolsWithCoords: schoolsWithCoords.length,
          schoolsWithoutCoords: schoolsWithoutCoords.length,
          sampleSchools: schools.slice(0, 10).map((s: any) => ({
            id: s.id,
            name: s.school_name,
            city: s.city,
            district: s.district,
            hasCoords: !!(s.latitude && s.longitude),
            latitude: s.latitude,
            longitude: s.longitude
          }))
        }
      }
    });

  } catch (error: any) {
    logger.error(`获取市场潜力统计失败: ${error.message}`, error);
    res.status(500).json({ success: false, message: `获取市场潜力统计失败: ${error.message}` });
  }
});

export default router;
