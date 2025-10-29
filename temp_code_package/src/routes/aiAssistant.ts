/**
 * AI开发助手API路由
 * 提供ChatGPT集成的开发辅助功能
 */
import { Router, Request, Response } from 'express';
import { OpenAIService } from '../services/OpenAIService';
import { logger } from '../utils/logger';

const router = Router();
const openaiService = new OpenAIService();

// 代码审查
router.post('/code-review', async (req: Request, res: Response) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: '代码内容不能为空',
      });
    }

    const result = await openaiService.reviewCode(code, language);

    res.json(result);
  } catch (error) {
    logger.error('代码审查失败:', error);
    res.status(500).json({
      success: false,
      error: '代码审查失败',
    });
  }
});

// 业务数据分析
router.post('/analyze-data', async (req: Request, res: Response) => {
  try {
    const { data, analysisType } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: '数据内容不能为空',
      });
    }

    const result = await openaiService.analyzeBusinessData(data, analysisType);

    res.json(result);
  } catch (error) {
    logger.error('数据分析失败:', error);
    res.status(500).json({
      success: false,
      error: '数据分析失败',
    });
  }
});

// 生成智能报告
router.post('/generate-report', async (req: Request, res: Response) => {
  try {
    const { data, reportType } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: '数据内容不能为空',
      });
    }

    const result = await openaiService.generateReport(data, reportType);

    res.json(result);
  } catch (error) {
    logger.error('报告生成失败:', error);
    res.status(500).json({
      success: false,
      error: '报告生成失败',
    });
  }
});

// 错误诊断
router.post('/diagnose-error', async (req: Request, res: Response) => {
  try {
    const { error, context } = req.body;

    if (!error) {
      return res.status(400).json({
        success: false,
        error: '错误信息不能为空',
      });
    }

    const result = await openaiService.diagnoseError(error, context);

    res.json(result);
  } catch (error) {
    logger.error('错误诊断失败:', error);
    res.status(500).json({
      success: false,
      error: '错误诊断失败',
    });
  }
});

// 性能优化建议
router.post('/optimize-performance', async (req: Request, res: Response) => {
  try {
    const { code, metrics } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: '代码内容不能为空',
      });
    }

    const result = await openaiService.optimizePerformance(code, metrics);

    res.json(result);
  } catch (error) {
    logger.error('性能优化失败:', error);
    res.status(500).json({
      success: false,
      error: '性能优化失败',
    });
  }
});

// 智能代码生成
router.post('/generate-code', async (req: Request, res: Response) => {
  try {
    const { description, language, requirements } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        error: '功能描述不能为空',
      });
    }

    const prompt = `
请根据以下需求生成${language}代码：

功能描述: ${description}
技术要求: ${requirements || '无特殊要求'}

请提供：
1. 完整的代码实现
2. 代码注释
3. 使用示例
4. 注意事项

请用中文回复。
    `;

    const result = await openaiService.client.chat.completions.create({
      model: openaiService['model'],
      messages: [
        {
          role: 'system',
          content: '你是一个专业的软件工程师，擅长各种编程语言和最佳实践。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 3000,
      temperature: 0.3,
    });

    res.json({
      success: true,
      code: result.choices[0].message.content,
      usage: result.usage,
    });
  } catch (error) {
    logger.error('代码生成失败:', error);
    res.status(500).json({
      success: false,
      error: '代码生成失败',
    });
  }
});

// 技术文档生成
router.post('/generate-docs', async (req: Request, res: Response) => {
  try {
    const { code, docType } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: '代码内容不能为空',
      });
    }

    const prompt = `
请为以下代码生成${docType}文档：

\`\`\`typescript
${code}
\`\`\`

请提供：
1. 功能说明
2. 参数说明
3. 返回值说明
4. 使用示例
5. 注意事项

请用中文生成专业的API文档。
    `;

    const result = await openaiService.client.chat.completions.create({
      model: openaiService['model'],
      messages: [
        {
          role: 'system',
          content: '你是一个专业的技术文档编写专家，擅长生成清晰、准确的API文档。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    res.json({
      success: true,
      documentation: result.choices[0].message.content,
      usage: result.usage,
    });
  } catch (error) {
    logger.error('文档生成失败:', error);
    res.status(500).json({
      success: false,
      error: '文档生成失败',
    });
  }
});

export default router;
