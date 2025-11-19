import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { logger } from '../utils/logger';

const router = Router();

// 获取地区级联数据
router.get('/cascade', async (req: Request, res: Response) => {
  try {
    // 首先检查表是否存在
    const tableCheckQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'region_hierarchy'
    `;
    
    const tableExists = await sequelize.query(tableCheckQuery, {
      type: QueryTypes.SELECT,
    }) as any[];

    if (!tableExists || tableExists.length === 0) {
      logger.warn('region_hierarchy表不存在，尝试使用stores表生成地区数据');
      
      // 如果表不存在，从stores表生成地区数据
      const fallbackQuery = `
        SELECT DISTINCT
          province as value,
          province as label,
          1 as level,
          NULL as parent_code
        FROM stores 
        WHERE province IS NOT NULL AND province != '' AND delflag = 0
        UNION ALL
        SELECT DISTINCT
          city as value,
          city as label,
          2 as level,
          province as parent_code
        FROM stores 
        WHERE city IS NOT NULL AND city != '' AND delflag = 0
        UNION ALL
        SELECT DISTINCT
          district as value,
          district as label,
          3 as level,
          city as parent_code
        FROM stores 
        WHERE district IS NOT NULL AND district != '' AND delflag = 0
        ORDER BY level, label
      `;

      const regions = await sequelize.query(fallbackQuery, {
        type: QueryTypes.SELECT,
      }) as any[];

      const cascadeData = buildCascadeData(regions);
      
      return res.json({
        success: true,
        data: cascadeData,
        message: '使用stores表生成地区数据'
      });
    }

    const query = `
      SELECT 
        code as value,
        name as label,
        level,
        parent_code
      FROM region_hierarchy 
      WHERE is_active = 1
      ORDER BY level, sort_order, name
    `;

    const regions = await sequelize.query(query, {
      type: QueryTypes.SELECT,
    }) as any[];

    const cascadeData = buildCascadeData(regions);

    res.json({
      success: true,
      data: cascadeData,
    });
  } catch (error) {
    logger.error('获取地区级联数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取地区级联数据失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 构建级联数据结构（辅助函数）
function buildCascadeData(regions: any[]) {
  const result: any[] = [];
  const regionMap = new Map();

  // 创建映射
  regions.forEach(region => {
    if (region.value && region.label) {
      regionMap.set(region.value, {
        ...region,
        children: [],
      });
    }
  });

  // 构建层级关系
  regions.forEach(region => {
    if (!region.value || !region.label) return;
    
    if (region.parent_code) {
      const parent = regionMap.get(region.parent_code);
      if (parent) {
        parent.children.push(regionMap.get(region.value));
      }
    } else {
      result.push(regionMap.get(region.value));
    }
  });

  return result;
}

// 获取地区统计信息
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    // 获取区域层级统计
    const regionQuery = `
      SELECT 
        level,
        COUNT(*) as count
      FROM region_hierarchy 
      WHERE is_active = 1
      GROUP BY level
      ORDER BY level
    `;

    const regionStats = await sequelize.query(regionQuery, {
      type: QueryTypes.SELECT,
    });

    // 获取实际运营统计
    const operatingQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN city IS NOT NULL AND city != '' THEN city END) as operating_cities,
        COUNT(DISTINCT CASE WHEN province IS NOT NULL AND province != '' THEN province END) as operating_provinces,
        COUNT(*) as operating_stores
      FROM stores 
      WHERE delflag = 0 AND status = 'active'
    `;

    const operatingStats = await sequelize.query(operatingQuery, {
      type: QueryTypes.SELECT,
    });

    // 合并数据
    const operatingData = operatingStats[0] as any;
    const result = [
      ...regionStats,
      {
        level: 'operating',
        operating_cities: operatingData?.operating_cities || 0,
        operating_provinces: operatingData?.operating_provinces || 0,
        operating_stores: operatingData?.operating_stores || 0,
      },
    ];

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('获取地区统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取地区统计信息失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

export default router;
