import express from 'express';
import SystemMonitoringService from '../services/SystemMonitoringService';
import { logger } from '../utils/logger';

const router = express.Router();
const monitoringService = new SystemMonitoringService();

// 启动系统监控
monitoringService.startMonitoring(30000); // 30秒间隔

/**
 * 获取系统健康状态
 * GET /api/system-monitoring/health
 */
router.get('/health', async (req, res) => {
  try {
    const health = monitoringService.getSystemHealth();
    
    res.json({
      success: true,
      message: '系统健康状态获取成功',
      data: health
    });

  } catch (error) {
    logger.error('获取系统健康状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统健康状态失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取系统指标历史
 * GET /api/system-monitoring/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const metrics = monitoringService.getMetricsHistory(parseInt(hours as string));
    
    res.json({
      success: true,
      message: '系统指标历史获取成功',
      data: {
        metrics,
        count: metrics.length,
        timeRange: `${hours}小时`
      }
    });

  } catch (error) {
    logger.error('获取系统指标历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统指标历史失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取性能警报
 * GET /api/system-monitoring/alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const { severity } = req.query;
    const alerts = monitoringService.getAlerts(severity as any);
    
    res.json({
      success: true,
      message: '性能警报获取成功',
      data: {
        alerts,
        count: alerts.length,
        severity: severity || 'all'
      }
    });

  } catch (error) {
    logger.error('获取性能警报失败:', error);
    res.status(500).json({
      success: false,
      message: '获取性能警报失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 解决警报
 * POST /api/system-monitoring/alerts/:alertId/resolve
 */
router.post('/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const resolved = monitoringService.resolveAlert(alertId);
    
    if (resolved) {
      res.json({
        success: true,
        message: '警报已解决',
        data: { alertId }
      });
    } else {
      res.status(404).json({
        success: false,
        message: '警报不存在',
        data: null
      });
    }

  } catch (error) {
    logger.error('解决警报失败:', error);
    res.status(500).json({
      success: false,
      message: '解决警报失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取数据库性能指标
 * GET /api/system-monitoring/database-performance
 */
router.get('/database-performance', async (req, res) => {
  try {
    const performanceMetrics = await monitoringService.getDatabasePerformanceMetrics();
    
    res.json({
      success: true,
      message: '数据库性能指标获取成功',
      data: performanceMetrics
    });

  } catch (error) {
    logger.error('获取数据库性能指标失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据库性能指标失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 生成性能报告
 * GET /api/system-monitoring/performance-report
 */
router.get('/performance-report', async (req, res) => {
  try {
    const report = monitoringService.generatePerformanceReport();
    
    res.json({
      success: true,
      message: '性能报告生成成功',
      data: report
    });

  } catch (error) {
    logger.error('生成性能报告失败:', error);
    res.status(500).json({
      success: false,
      message: '生成性能报告失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取监控状态
 * GET /api/system-monitoring/status
 */
router.get('/status', async (req, res) => {
  try {
    const status = monitoringService.getMonitoringStatus();
    
    res.json({
      success: true,
      message: '监控状态获取成功',
      data: status
    });

  } catch (error) {
    logger.error('获取监控状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取监控状态失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 控制监控服务
 * POST /api/system-monitoring/control
 */
router.post('/control', async (req, res) => {
  try {
    const { action } = req.body;
    
    if (action === 'start') {
      monitoringService.startMonitoring();
      res.json({
        success: true,
        message: '监控服务已启动',
        data: { action: 'started' }
      });
    } else if (action === 'stop') {
      monitoringService.stopMonitoring();
      res.json({
        success: true,
        message: '监控服务已停止',
        data: { action: 'stopped' }
      });
    } else {
      res.status(400).json({
        success: false,
        message: '无效的操作',
        data: null
      });
    }

  } catch (error) {
    logger.error('控制监控服务失败:', error);
    res.status(500).json({
      success: false,
      message: '控制监控服务失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
