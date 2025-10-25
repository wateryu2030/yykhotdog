/**
 * AI洞察API路由
 * 提供ETL分析层数据的API接口
 */
import { Router, Request, Response } from 'express';
import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger';

const router = Router();

// 获取利润分析数据
router.get('/profit-analysis', async (req: Request, res: Response) => {
  try {
    const sequelize = new Sequelize({
      dialect: 'mssql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '1433'),
      database: 'hotdog2030',
      username: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD || 'Passw0rd',
      logging: false,
    });

    const [results] = await sequelize.query(`
      SELECT TOP 20
        fp.store_id,
        s.store_name,
        s.city,
        fp.revenue as total_revenue,
        fp.cogs as total_cost,
        (fp.revenue - fp.cogs) as gross_profit,
        CASE 
          WHEN fp.revenue > 0 THEN ((fp.revenue - fp.cogs) / fp.revenue * 100)
          ELSE 0 
        END as gross_profit_margin,
        (fp.revenue - fp.cogs - fp.operating_exp) as net_profit,
        CASE 
          WHEN fp.revenue > 0 THEN ((fp.revenue - fp.cogs - fp.operating_exp) / fp.revenue * 100)
          ELSE 0 
        END as net_profit_margin,
        fp.date_key
      FROM fact_profit_daily fp
      JOIN stores s ON s.id = fp.store_id
      WHERE fp.date_key >= CONVERT(int, FORMAT(DATEADD(day, -30, GETDATE()), 'yyyyMMdd'))
      ORDER BY fp.revenue DESC
    `);

    res.json({
      success: true,
      data: results,
      message: '利润分析数据获取成功'
    });
  } catch (error) {
    logger.error('获取利润分析数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取利润分析数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取客户分群数据
router.get('/customer-segments', async (req: Request, res: Response) => {
  try {
    const sequelize = new Sequelize({
      dialect: 'mssql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '1433'),
      database: 'hotdog2030',
      username: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD || 'Passw0rd',
      logging: false,
    });

    const [results] = await sequelize.query(`
      SELECT TOP 100
        customer_id,
        r_score,
        f_score,
        m_score,
        segment_code,
        updated_at
      FROM dim_customer_segment
      ORDER BY segment_code DESC
    `);

    res.json({
      success: true,
      data: results,
      message: '客户分群数据获取成功'
    });
  } catch (error) {
    logger.error('获取客户分群数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取客户分群数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取销售预测数据
router.get('/sales-forecasts', async (req: Request, res: Response) => {
  try {
    const sequelize = new Sequelize({
      dialect: 'mssql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '1433'),
      database: 'hotdog2030',
      username: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD || 'Passw0rd',
      logging: false,
    });

    const [results] = await sequelize.query(`
      SELECT TOP 50
        s.store_name,
        ff.date_key,
        ff.yhat,
        ff.model_name
      FROM fact_forecast_daily ff
      JOIN stores s ON s.id = ff.store_id
      WHERE ff.date_key >= CONVERT(int, FORMAT(GETDATE(), 'yyyyMMdd'))
      ORDER BY ff.yhat DESC
    `);

    res.json({
      success: true,
      data: results,
      message: '销售预测数据获取成功'
    });
  } catch (error) {
    logger.error('获取销售预测数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取销售预测数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取选址评分数据
router.get('/site-scores', async (req: Request, res: Response) => {
  try {
    const sequelize = new Sequelize({
      dialect: 'mssql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '1433'),
      database: 'hotdog2030',
      username: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD || 'Passw0rd',
      logging: false,
    });

    const [results] = await sequelize.query(`
      SELECT TOP 20
        candidate_id,
        city,
        match_score,
        cannibal_score,
        total_score,
        rationale
      FROM fact_site_score
      ORDER BY total_score DESC
    `);

    res.json({
      success: true,
      data: results,
      message: '选址评分数据获取成功'
    });
  } catch (error) {
    logger.error('获取选址评分数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取选址评分数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取仪表板指标数据
router.get('/dashboard-metrics', async (req: Request, res: Response) => {
  try {
    const sequelize = new Sequelize({
      dialect: 'mssql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '1433'),
      database: 'hotdog2030',
      username: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD || 'Passw0rd',
      logging: false,
    });

    const [results] = await sequelize.query(`
      SELECT 
        SUM(revenue) as total_revenue,
        SUM(orders_cnt) as total_orders,
        AVG(revenue / NULLIF(orders_cnt, 0)) as avg_order_value,
        COUNT(DISTINCT store_id) as unique_stores
      FROM vw_kpi_store_daily
      WHERE date_key >= CONVERT(int, FORMAT(DATEADD(day, -30, GETDATE()), 'yyyyMMdd'))
    `);

    res.json({
      success: true,
      data: results[0] || {},
      message: '仪表板指标数据获取成功'
    });
  } catch (error) {
    logger.error('获取仪表板指标数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取仪表板指标数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取AI洞察建议
router.get('/insights', async (req: Request, res: Response) => {
  try {
    const sequelize = new Sequelize({
      dialect: 'mssql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '1433'),
      database: 'hotdog2030',
      username: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD || 'Passw0rd',
      logging: false,
    });

    // 获取各种洞察数据
    const [profitData] = await sequelize.query(`
      SELECT AVG((revenue - cogs) / NULLIF(revenue, 0) * 100) as avg_margin
      FROM fact_profit_daily
      WHERE date_key >= CONVERT(int, FORMAT(DATEADD(day, -30, GETDATE()), 'yyyyMMdd'))
    `);

    const [customerData] = await sequelize.query(`
      SELECT COUNT(*) as total_customers,
             COUNT(CASE WHEN segment_code >= 444 THEN 1 END) as vip_customers
      FROM dim_customer_segment
    `);

    const [forecastData] = await sequelize.query(`
      SELECT AVG(yhat) as avg_forecast
      FROM fact_forecast_daily
      WHERE date_key >= CONVERT(int, FORMAT(GETDATE(), 'yyyyMMdd'))
    `);

    const insights = [];

    // 利润洞察
    if (profitData[0] && (profitData[0] as any).avg_margin < 30) {
      insights.push({
        type: 'warning',
        title: '毛利率偏低',
        description: `平均毛利率仅${(profitData[0] as any).avg_margin.toFixed(1)}%，建议优化成本结构`,
        priority: 'high'
      });
    }

    // 客户洞察
    if (customerData[0]) {
      const vipRatio = ((customerData[0] as any).vip_customers / (customerData[0] as any).total_customers * 100).toFixed(1);
      insights.push({
        type: 'info',
        title: 'VIP客户分析',
        description: `VIP客户占比${vipRatio}%，共${(customerData[0] as any).vip_customers}人`,
        priority: 'medium'
      });
    }

    // 预测洞察
    if (forecastData[0] && (forecastData[0] as any).avg_forecast > 0) {
      insights.push({
        type: 'success',
        title: '销售预测',
        description: `未来7天平均预测销售额¥${(forecastData[0] as any).avg_forecast.toFixed(2)}`,
        priority: 'low'
      });
    }

    res.json({
      success: true,
      data: insights,
      message: 'AI洞察建议获取成功'
    });
  } catch (error) {
    logger.error('获取AI洞察建议失败:', error);
    res.status(500).json({
      success: false,
      message: '获取AI洞察建议失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
