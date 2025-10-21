import { Router } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';

export const aiModelPerformance = Router();

// 记录AI任务日志
export const recordTaskLog = async (
  taskName: string,
  modelUsed: string | null,
  executionTimeMs: number,
  success: boolean,
  errorMessage: string | null = null,
  inputTokens: number | null = null,
  outputTokens: number | null = null,
  costUsd: number | null = null
) => {
  try {
    await sequelize.query(`
      INSERT INTO ai_task_log
      (task_name, model_used, execution_time_ms, success, error_message, input_tokens, output_tokens, cost_usd)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        taskName,
        modelUsed,
        executionTimeMs,
        success ? 1 : 0,
        errorMessage,
        inputTokens,
        outputTokens,
        costUsd
      ],
      type: QueryTypes.INSERT
    });

    // 更新模型优先级表
    if (modelUsed) {
      await sequelize.query(`
        UPDATE ai_model_priority
        SET
          last_latency_ms = ?,
          total_calls = total_calls + 1,
          failed_calls = failed_calls + ?,
          last_used = GETDATE(),
          updated_at = GETDATE()
        WHERE model_name = ?
      `, {
        replacements: [executionTimeMs, success ? 0 : 1, modelUsed],
        type: QueryTypes.UPDATE
      });
    }

  } catch (error) {
    console.error('❌ [AI Performance] 记录任务日志失败:', error);
  }
};

// 获取模型性能评估
aiModelPerformance.get('/ai/model/performance', async (_req, res) => {
  try {
    const modelPerformance: any[] = await sequelize.query(`
      SELECT * FROM vw_ai_model_performance
      ORDER BY priority_score DESC
    `, { type: QueryTypes.SELECT });

    const taskStats: any[] = await sequelize.query(`
      SELECT * FROM vw_ai_task_stats
      ORDER BY last_run DESC
    `, { type: QueryTypes.SELECT });

    const performanceMetrics = {
      totalModels: modelPerformance.length,
      avgSuccessRate: modelPerformance.length > 0
        ? modelPerformance.reduce((sum, m) => sum + (m.calculated_success_rate || 0), 0) / modelPerformance.length
        : 0,
      avgLatency: modelPerformance.length > 0
        ? modelPerformance.reduce((sum, m) => sum + (m.last_latency_ms || 0), 0) / modelPerformance.length
        : 0,
      totalTasks: taskStats.reduce((sum, t) => sum + (t.total_runs || 0), 0),
      totalCost: taskStats.reduce((sum, t) => sum + (t.total_cost || 0), 0),
    };

    res.json({
      success: true,
      data: {
        modelPerformance,
        taskStats,
        performanceMetrics,
        evaluationDate: new Date()
      }
    });
  } catch (error: any) {
    console.error('❌ [AI Performance] 获取模型性能评估失败:', error);
    res.status(500).json({
      success: false,
      error: `模型性能评估失败: ${error.message}`
    });
  }
});

// 评估并更新模型优先级
aiModelPerformance.post('/ai/model/evaluate', async (_req, res) => {
  try {
    console.log('🔍 [AI Performance] 开始评估模型性能并更新优先级...');
    const models: any[] = await sequelize.query(`
      SELECT model_name, last_latency_ms, total_calls, failed_calls
      FROM ai_model_priority
    `, { type: QueryTypes.SELECT });

    for (const model of models) {
      const successRate = model.total_calls > 0
        ? ((model.total_calls - model.failed_calls) / model.total_calls) * 100
        : 0;
      const latencyScore = model.last_latency_ms ? Math.max(0, 100 - (model.last_latency_ms / 1000)) : 50;
      const usageScore = model.total_calls > 0 ? Math.min(100, model.total_calls * 2) : 0;

      const newPriorityScore = (successRate * 0.4) + (latencyScore * 0.3) + (usageScore * 0.3);

      await sequelize.query(`
        UPDATE ai_model_priority
        SET priority_score = ?, updated_at = GETDATE()
        WHERE model_name = ?
      `, {
        replacements: [newPriorityScore, model.model_name],
        type: QueryTypes.UPDATE
      });
    }

    console.log('✅ [AI Performance] 模型性能评估完成');
    res.json({ success: true, message: '模型性能评估完成，优先级已更新' });
  } catch (error: any) {
    console.error('❌ [AI Performance] 模型性能评估失败:', error);
    res.status(500).json({
      success: false,
      error: `模型性能评估失败: ${error.message}`
    });
  }
});

// 手动更新模型优先级
aiModelPerformance.post('/ai/model/update-priority', async (req, res) => {
  const { modelName, priorityScore } = req.body;
  if (!modelName || priorityScore === undefined) {
    return res.status(400).json({
      success: false,
      error: '缺少必要参数: modelName, priorityScore'
    });
  }

  await sequelize.query(`
    UPDATE ai_model_priority
    SET priority_score = ?, updated_at = GETDATE()
    WHERE model_name = ?
  `, {
    replacements: [priorityScore, modelName],
    type: QueryTypes.UPDATE
  });

  res.json({
    success: true,
    message: `模型 ${modelName} 优先级已更新为 ${priorityScore}`
  });
});
