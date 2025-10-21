import { Router } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import axios from 'axios';
import { recordTaskLog } from './ai.model.performance';

export const aiAlertSummary = Router();

// AI异常总结接口
aiAlertSummary.get('/ai/alert/summary', async (_req, res) => {
  const startTime = Date.now();
  let success = false;
  let errorMessage = '';
  let modelUsed = 'openai-gpt-4o-mini';

  try {
    console.log('🔍 [AI Alert] 开始分析异常情况...');

    // 模拟异常数据（简化版本）
    const anomalyRows: any[] = [
      { store_id: 1, store_name: '测试门店1', city: '北京', anomaly_count: 0, avg_deviation: 0, latest_anomaly_date: new Date() },
      { store_id: 2, store_name: '测试门店2', city: '上海', anomaly_count: 0, avg_deviation: 0, latest_anomaly_date: new Date() }
    ];

    const overallStats = [{ total_stores: 2, total_anomalies: 0, avg_deviation: 0 }];

    const stats = overallStats[0] || { total_stores: 0, total_anomalies: 0, avg_deviation: 0 };
    
    // 构建AI分析提示
    const prompt = `
作为连锁餐饮的智能风控分析师，请分析以下经营异常数据：

异常门店数据：
${JSON.stringify(anomalyRows, null, 2)}

整体经营统计：
${JSON.stringify(stats, null, 2)}

请输出用中文总结经营风险最高的门店和建议措施。如果暂无异常，请说明。
`;

    const aiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '你是连锁餐饮的智能风控分析师' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    }, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } });

    const aiSummary = aiResponse.data.choices?.[0]?.message?.content || '暂无异常分析结果';

    // 保存分析结果到数据库
    await sequelize.query(`
      INSERT INTO ai_alert_summary
      (analysis_date, risk_level, summary_text, anomaly_count, created_at)
      VALUES (GETDATE(), ?, ?, ?, GETDATE())
    `, {
      replacements: [
        anomalyRows.length > 5 ? '高' : anomalyRows.length > 2 ? '中' : '低',
        aiSummary,
        stats.total_anomalies || 0
      ],
      type: QueryTypes.INSERT
    });

    console.log('✅ [AI Alert] 异常分析完成');
    success = true;

    res.json({
      success: true,
      data: {
        riskLevel: anomalyRows.length > 5 ? '高' : anomalyRows.length > 2 ? '中' : '低',
        summary: aiSummary,
        anomalyCount: stats.total_anomalies || 0,
        totalStores: stats.total_stores || 0,
        topAnomalyStores: anomalyRows.slice(0, 5),
        analysisDate: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ [AI Alert] 异常分析失败:', error.message);
    errorMessage = error.message;
    res.status(500).json({
      success: false,
      error: 'AI异常分析失败: ' + error.message
    });
  } finally {
    await recordTaskLog(
      'AI异常分析',
      modelUsed,
      Date.now() - startTime,
      success,
      errorMessage
    );
  }
});

// 获取最新的异常总结
aiAlertSummary.get('/ai/alert/latest', async (_req, res) => {
  try {
    const latestSummary: any[] = await sequelize.query(`
      SELECT TOP 1 * FROM ai_alert_summary 
      ORDER BY created_at DESC
    `, { type: QueryTypes.SELECT });

    if (latestSummary.length === 0) {
      return res.json({
        success: true,
        data: {
          summary: '暂无异常分析数据',
          riskLevel: '低',
          analysisDate: new Date().toISOString(),
          anomalyCount: 0,
          totalStores: 0,
          topAnomalyStores: []
        }
      });
    }

    const summary = latestSummary[0];
    res.json({
      success: true,
      data: {
        summary: summary.summary_text,
        riskLevel: summary.risk_level,
        analysisDate: summary.analysis_date,
        anomalyCount: summary.anomaly_count || 0,
        totalStores: 0,
        topAnomalyStores: []
      }
    });

  } catch (error: any) {
    console.error('❌ [AI Alert] 获取最新总结失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取异常总结失败: ' + error.message
    });
  }
});
