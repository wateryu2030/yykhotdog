import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { logger } from '../utils/logger';

const router = Router();

// 获取地区级联数据
router.get('/cascade', async (req: Request, res: Response) => {
  try {
    logger.info('开始获取地区级联数据');
    
    // 首先尝试使用region_hierarchy表
    let regions: any[] = [];
    let useFallback = false;
    
    try {
      const query = `
        SELECT 
          code as value,
          name as label,
          level,
          parent_code
        FROM region_hierarchy 
        WHERE is_active = 1 OR is_active IS NULL
        ORDER BY level, ISNULL(sort_order, 999), name
      `;

      regions = await sequelize.query(query, {
        type: QueryTypes.SELECT,
      }) as any[];
      
      if (regions.length > 0) {
        logger.info(`从region_hierarchy表获取${regions.length}条地区数据`);
      } else {
        useFallback = true;
      }
    } catch (regionHierarchyError: any) {
      logger.warn('region_hierarchy表查询失败，尝试使用stores表:', regionHierarchyError?.message);
      useFallback = true;
    }

    // 如果region_hierarchy表没有数据或查询失败，使用stores表作为备用方案
    if (useFallback || regions.length === 0) {
      logger.info('尝试使用stores表生成地区数据');
      
      try {
        const fallbackQuery = `
          SELECT DISTINCT
            CAST(province AS NVARCHAR(50)) as value,
            CAST(province AS NVARCHAR(50)) as label,
            1 as level,
            NULL as parent_code
          FROM stores 
          WHERE province IS NOT NULL AND province != '' AND delflag = 0
          UNION ALL
          SELECT DISTINCT
            CAST(city AS NVARCHAR(50)) as value,
            CAST(city AS NVARCHAR(50)) as label,
            2 as level,
            CAST(province AS NVARCHAR(50)) as parent_code
          FROM stores 
          WHERE city IS NOT NULL AND city != '' AND delflag = 0
          UNION ALL
          SELECT DISTINCT
            CAST(district AS NVARCHAR(50)) as value,
            CAST(district AS NVARCHAR(50)) as label,
            3 as level,
            CAST(city AS NVARCHAR(50)) as parent_code
          FROM stores 
          WHERE district IS NOT NULL AND district != '' AND delflag = 0
          ORDER BY level, label
        `;

        regions = await sequelize.query(fallbackQuery, {
          type: QueryTypes.SELECT,
        }) as any[];
        
        logger.info(`从stores表获取${regions.length}条地区数据`);
      } catch (fallbackError: any) {
        logger.error('stores表查询也失败:', fallbackError);
        // 如果stores表也失败，返回空数组而不是错误
        regions = [];
      }
    }

    if (regions.length === 0) {
      logger.warn('未找到任何地区数据');
      return res.json({
        success: true,
        data: [],
        message: '未找到地区数据，请检查数据库'
      });
    }

    // 构建级联数据结构
    const cascadeData = buildCascadeData(regions);

    logger.info(`成功构建地区级联数据，共${cascadeData.length}个顶级节点`);

    res.json({
      success: true,
      data: cascadeData,
      message: useFallback ? '使用stores表生成地区数据' : '使用region_hierarchy表生成地区数据'
    });
  } catch (error: any) {
    logger.error('获取地区级联数据失败:', error);
    logger.error('错误堆栈:', error?.stack);
    
    res.status(500).json({
      success: false,
      error: '获取地区级联数据失败',
      details: error?.message || '未知错误',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
});

// 构建级联数据结构（辅助函数）
function buildCascadeData(regions: any[]) {
  const result: any[] = [];
  const regionMap = new Map();

  if (!regions || regions.length === 0) {
    logger.warn('buildCascadeData: 输入数据为空');
    return result;
  }

  // 创建映射（过滤无效数据）
  regions.forEach(region => {
    if (region && region.value && region.label) {
      const key = String(region.value).trim();
      if (key) {
        regionMap.set(key, {
          value: key,
          label: String(region.label).trim(),
          level: region.level || 1,
          parent_code: region.parent_code ? String(region.parent_code).trim() : null,
          children: [],
        });
      }
    }
  });

  logger.info(`buildCascadeData: 创建了${regionMap.size}个地区映射`);

  // 构建层级关系
  let addedCount = 0;
  let orphanCount = 0;
  
  regionMap.forEach((region, key) => {
    if (region.parent_code) {
      const parentKey = String(region.parent_code).trim();
      const parent = regionMap.get(parentKey);
      if (parent) {
        parent.children.push(region);
        addedCount++;
      } else {
        // 父节点不存在，作为顶级节点
        result.push(region);
        orphanCount++;
        logger.warn(`地区 ${region.label} 的父节点 ${parentKey} 不存在，作为顶级节点`);
      }
    } else {
      // 没有父节点，作为顶级节点
      result.push(region);
      addedCount++;
    }
  });

  logger.info(`buildCascadeData: 构建完成，顶级节点${result.length}个，孤儿节点${orphanCount}个`);

  // 对每个层级的children进行排序
  const sortChildren = (nodes: any[]) => {
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a: any, b: any) => {
          if (a.label && b.label) {
            return a.label.localeCompare(b.label, 'zh-CN');
          }
          return 0;
        });
        sortChildren(node.children);
      }
    });
  };
  
  sortChildren(result);

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
