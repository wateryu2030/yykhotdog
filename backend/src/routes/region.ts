import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

const router = Router();

// 获取地区级联数据
router.get('/cascade', async (req: Request, res: Response) => {
  try {
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
    });

    // 构建级联数据结构
    const buildCascadeData = (regions: any[]) => {
      const result: any[] = [];
      const regionMap = new Map();

      // 创建映射
      regions.forEach(region => {
        regionMap.set(region.value, {
          ...region,
          children: [],
        });
      });

      // 构建层级关系
      regions.forEach(region => {
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
    };

    const cascadeData = buildCascadeData(regions as any[]);

    res.json({
      success: true,
      data: cascadeData,
    });
  } catch (error) {
    console.error('获取地区级联数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取地区级联数据失败',
      details: error instanceof Error ? error.message : '未知错误',
    });
  }
});

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
