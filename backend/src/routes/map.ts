import { Router, Request, Response } from 'express';
import { AmapService } from '../services/MapService';
import { logger } from '../utils/logger';

const router = Router();

// 测试路由
router.get('/test', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Map router is working' });
});

// 逆地理编码
router.get('/reverse-geocode', async (req: Request, res: Response) => {
  try {
    const { longitude, latitude } = req.query;
    
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: '缺少经纬度参数'
      });
    }

    const result = await AmapService.reverseGeocode(
      parseFloat(longitude as string),
      parseFloat(latitude as string)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('逆地理编码失败:', error);
    res.status(500).json({
      success: false,
      message: '逆地理编码失败'
    });
  }
});

// 天气查询
router.get('/weather', async (req: Request, res: Response) => {
  try {
    const { city } = req.query;
    
    if (!city) {
      return res.status(400).json({
        success: false,
        message: '缺少城市参数'
      });
    }

    const result = await AmapService.getWeather(city as string);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('天气查询失败:', error);
    res.status(500).json({
      success: false,
      message: '天气查询失败'
    });
  }
});

// POI搜索
router.get('/poi-search', async (req: Request, res: Response) => {
  try {
    const { keyword, city, longitude, latitude } = req.query;
    if (!keyword || !city || !longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: '缺少关键词、城市或经纬度参数'
      });
    }
    const result = await AmapService.searchNearby(
      parseFloat(longitude as string),
      parseFloat(latitude as string),
      keyword as string
    );
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('POI搜索失败:', error);
    res.status(500).json({
      success: false,
      message: 'POI搜索失败'
    });
  }
});

// 高德地图地理编码代理
router.get('/geocode', async (req: Request, res: Response) => {
  try {
    const { address } = req.query;
    
    logger.info('地理编码请求参数:', { address, type: typeof address });
    
    if (!address) {
      logger.error('缺少地址参数');
      return res.status(400).json({
        success: false,
        message: '缺少地址参数'
      });
    }

    // 确保地址参数是字符串类型
    const addressStr = typeof address === 'string' ? address : String(address);
    logger.info('处理后的地址参数:', { addressStr });

    const apiKey = process.env.AMAP_WEB_API_KEY || '6ca87ddc68113a085ad770fcd6a3d5d9';
    const queryParams = new URLSearchParams({
      key: apiKey,
      address: addressStr,
      output: 'json'
    });

    const response = await fetch(`https://restapi.amap.com/v3/geocode/geo?${queryParams}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SiteSelection/1.0)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      logger.error(`地理编码API HTTP错误: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as any;
    
    logger.info('地理编码API响应:', { status: data.status, info: data.info, count: data.count });
    
    if (data.status !== '1') {
      logger.error('地理编码API返回错误:', { status: data.status, info: data.info });
      throw new Error(`地理编码失败: ${data.info}`);
    }
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    logger.error('地理编码代理失败:', error);
    res.status(500).json({
      success: false,
      message: '地理编码失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 高德地图POI搜索代理
router.get('/poi', async (req: Request, res: Response) => {
  try {
    const { keywords, city, types, offset, page, extensions } = req.query;
    
    if (!keywords || !city) {
      return res.status(400).json({
        success: false,
        message: '缺少关键词或城市参数'
      });
    }

    const apiKey = process.env.AMAP_WEB_API_KEY || '6ca87ddc68113a085ad770fcd6a3d5d9';
    const queryParams = new URLSearchParams({
      key: apiKey,
      keywords: keywords as string,
      city: city as string,
      types: (types as string) || '',
      offset: (offset as string) || '20',
      page: (page as string) || '1',
      extensions: (extensions as string) || 'base',
      output: 'json'
    });

    const response = await fetch(`https://restapi.amap.com/v3/place/text?${queryParams}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SiteSelection/1.0)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    logger.error('POI搜索代理失败:', error);
    res.status(500).json({
      success: false,
      message: 'POI搜索失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 高德地图POI地理围栏搜索代理
router.get('/poi-around', async (req: Request, res: Response) => {
  try {
    const { keywords, location, radius, types, offset, page, extensions } = req.query;
    
    if (!keywords || !location) {
      return res.status(400).json({
        success: false,
        message: '缺少关键词或位置参数'
      });
    }

    const apiKey = process.env.AMAP_WEB_API_KEY || '6ca87ddc68113a085ad770fcd6a3d5d9';
    const queryParams = new URLSearchParams({
      key: apiKey,
      keywords: keywords as string,
      location: location as string,
      radius: (radius as string) || '3000',
      types: (types as string) || '',
      offset: (offset as string) || '20',
      page: (page as string) || '1',
      extensions: (extensions as string) || 'base',
      output: 'json'
    });

    const response = await fetch(`https://restapi.amap.com/v3/place/around?${queryParams}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SiteSelection/1.0)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    logger.error('POI地理围栏搜索代理失败:', error);
    res.status(500).json({
      success: false,
      message: 'POI地理围栏搜索失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router; 