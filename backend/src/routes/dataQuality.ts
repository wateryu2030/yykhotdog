import express from 'express';
import DataQualityService from '../services/DataQualityService';
import { logger } from '../utils/logger';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

const router = express.Router();
const dataQualityService = new DataQualityService();

/**
 * 执行数据质量检查
 * POST /api/data-quality/check
 */
router.post('/check', async (req, res) => {
  try {
    logger.info('开始执行数据质量检查');
    
    const report = await dataQualityService.performQualityCheck();
    
    res.json({
      success: true,
      message: '数据质量检查完成',
      data: report
    });

  } catch (error) {
    logger.error('数据质量检查失败:', error);
    res.status(500).json({
      success: false,
      message: '数据质量检查失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取数据质量规则
 * GET /api/data-quality/rules
 */
router.get('/rules', async (req, res) => {
  try {
    const rules = dataQualityService.getRules();
    
    res.json({
      success: true,
      message: '数据质量规则获取成功',
      data: rules
    });

  } catch (error) {
    logger.error('获取数据质量规则失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据质量规则失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 添加自定义数据质量规则
 * POST /api/data-quality/rules
 */
router.post('/rules', async (req, res) => {
  try {
    const { name, description, table, column, rule, severity, enabled } = req.body;
    
    if (!name || !description || !table || !rule || !severity) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
        data: null
      });
    }

    dataQualityService.addRule({
      name,
      description,
      table,
      column,
      rule,
      severity,
      enabled: enabled !== false
    });
    
    res.json({
      success: true,
      message: '数据质量规则添加成功',
      data: { name, table, rule }
    });

  } catch (error) {
    logger.error('添加数据质量规则失败:', error);
    res.status(500).json({
      success: false,
      message: '添加数据质量规则失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 更新数据质量规则
 * PUT /api/data-quality/rules/:ruleId
 */
router.put('/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;
    
    const updated = dataQualityService.updateRule(ruleId, updates);
    
    if (updated) {
      res.json({
        success: true,
        message: '数据质量规则更新成功',
        data: { ruleId }
      });
    } else {
      res.status(404).json({
        success: false,
        message: '数据质量规则不存在',
        data: null
      });
    }

  } catch (error) {
    logger.error('更新数据质量规则失败:', error);
    res.status(500).json({
      success: false,
      message: '更新数据质量规则失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 删除数据质量规则
 * DELETE /api/data-quality/rules/:ruleId
 */
router.delete('/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    
    const deleted = dataQualityService.removeRule(ruleId);
    
    if (deleted) {
      res.json({
        success: true,
        message: '数据质量规则删除成功',
        data: { ruleId }
      });
    } else {
      res.status(404).json({
        success: false,
        message: '数据质量规则不存在',
        data: null
      });
    }

  } catch (error) {
    logger.error('删除数据质量规则失败:', error);
    res.status(500).json({
      success: false,
      message: '删除数据质量规则失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取数据质量统计
 * GET /api/data-quality/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = dataQualityService.getQualityStats();
    
    res.json({
      success: true,
      message: '数据质量统计获取成功',
      data: stats
    });

  } catch (error) {
    logger.error('获取数据质量统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据质量统计失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 清理数据质量检查历史
 * DELETE /api/data-quality/history
 */
router.delete('/history', async (req, res) => {
  try {
    dataQualityService.clearHistory();
    
    res.json({
      success: true,
      message: '数据质量检查历史已清理',
      data: null
    });

  } catch (error) {
    logger.error('清理数据质量检查历史失败:', error);
    res.status(500).json({
      success: false,
      message: '清理数据质量检查历史失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 快速数据质量检查（仅检查关键规则）
 * GET /api/data-quality/quick-check
 */
router.get('/quick-check', async (req, res) => {
  try {
    // 只检查严重和高优先级规则
    const criticalRules = dataQualityService.getRules().filter(
      rule => rule.enabled && (rule.severity === 'critical' || rule.severity === 'high')
    );
    
    const issues = [];
    
    for (const rule of criticalRules) {
      try {
        let query: string;
        
        if (rule.rule === 'duplicate_check') {
          query = `
            SELECT COUNT(*) as count
            FROM (
              SELECT customer_id, store_id, created_at, total_amount
              FROM orders 
              GROUP BY customer_id, store_id, created_at, total_amount
              HAVING COUNT(*) > 1
            ) duplicates
          `;
        } else if (rule.rule === 'orphaned_check') {
          query = `
            SELECT COUNT(*) as count
            FROM order_items oi
            LEFT JOIN orders o ON oi.order_id = o.id
            WHERE o.id IS NULL
          `;
        } else {
          query = `
            SELECT COUNT(*) as count
            FROM ${rule.table}
            WHERE ${rule.rule}
          `;
        }
        
        const result = await sequelize.query(query, {
          type: QueryTypes.SELECT
        }) as any[];

        const count = result[0]?.count || 0;
        
        if (count > 0) {
          issues.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            count,
            table: rule.table
          });
        }
        
      } catch (error) {
        logger.error(`快速检查规则 ${rule.name} 失败:`, error);
      }
    }
    
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    
    res.json({
      success: true,
      message: '快速数据质量检查完成',
      data: {
        issues,
        summary: {
          totalIssues: issues.length,
          criticalIssues: criticalCount,
          highIssues: highCount,
          status: criticalCount > 0 ? 'critical' : highCount > 0 ? 'warning' : 'healthy'
        },
        checkedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('快速数据质量检查失败:', error);
    res.status(500).json({
      success: false,
      message: '快速数据质量检查失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
