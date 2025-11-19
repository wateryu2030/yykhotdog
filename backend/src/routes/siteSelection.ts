import { Router, Request, Response } from 'express';
import { SiteSelectionService, EnhancedSiteSelectionService } from '../services/SiteSelectionService';
import { MLSiteSelectionService } from '../services/MLSiteSelectionService';
import { SiteSelection } from '../models/SiteSelection';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { logger } from '../utils/logger';

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
    const query = `
      SELECT 
        COUNT(*) as total_analyses,
        AVG(score) as avg_score,
        MIN(score) as min_score,
        MAX(score) as max_score,
        COUNT(CASE WHEN score >= 80 THEN 1 END) as excellent_count,
        COUNT(CASE WHEN score >= 60 AND score < 80 THEN 1 END) as good_count,
        COUNT(CASE WHEN score < 60 THEN 1 END) as poor_count,
        COUNT(DISTINCT city) as cities_analyzed,
        COUNT(DISTINCT province) as provinces_analyzed
      FROM site_selections
      WHERE created_at >= DATEADD(month, -6, GETDATE())
    `;
    
    const result = await sequelize.query(query, { type: QueryTypes.SELECT });
    const stats = result[0] as any;
    
    // 获取城市分布
    const cityQuery = `
      SELECT 
        city,
        COUNT(*) as count,
        AVG(score) as avg_score
      FROM site_selections
      WHERE created_at >= DATEADD(month, -6, GETDATE())
      GROUP BY city
      ORDER BY count DESC
    `;
    
    const cityStats = await sequelize.query(cityQuery, { type: QueryTypes.SELECT });
    
    res.json({
      success: true,
      data: {
        overview: stats,
        cityDistribution: cityStats
      },
      message: '获取统计信息成功'
    });
    
  } catch (error) {
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
router.get('/candidates', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const city = req.query.city as string;
    const status = req.query.status as string;
    
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    let whereClause = 'WHERE delflag = 0';
    const replacements: any = {};
    
    if (city) {
      whereClause += ' AND city = :city';
      replacements.city = city;
    }
    
    if (status) {
      whereClause += ' AND status = :status';
      replacements.status = status;
    }
    
    // 查询意向铺位数据
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

    const finalRecords = (records as any[]).map(record => ({
      ...record,
      photo_url: photoMap[record.shop_name] || null
    }));
    
    // 查询总数
    const totalResult = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM candidate_locations 
      ${whereClause}
    `, {
      replacements,
      type: QueryTypes.SELECT
    });
    
    const total = (totalResult[0] as any).total;
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
    const { includeMLPrediction = true } = req.body;
    
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
      return res.status(404).json({ success: false, message: '意向铺位不存在' });
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
    
    res.json({
      success: true,
      data: {
        candidate,
        analysis: analysisResult
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

export default router;
