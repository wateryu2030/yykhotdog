/**
 * OpenAI服务集成
 * 提供ChatGPT、代码审查、智能分析等功能
 */
import OpenAI from 'openai';
import { logger } from '../utils/logger';

export class OpenAIService {
  public client: OpenAI;
  private model: string;

  constructor() {
    // 只有在有API密钥时才初始化OpenAI客户端
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORG_ID,
      });
    } else {
      this.client = null as any; // 临时设置为null，后续会检查
    }
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  }

  /**
   * 检查OpenAI是否可用
   */
  private checkOpenAI(): boolean {
    if (!this.client) {
      logger.warn('OpenAI API密钥未配置，请在.env文件中设置OPENAI_API_KEY');
      return false;
    }
    return true;
  }

  /**
   * 代码审查
   */
  async reviewCode(code: string, language: string = 'typescript'): Promise<any> {
    if (!this.checkOpenAI()) {
      return {
        success: false,
        error: 'OpenAI API密钥未配置',
        suggestion: '请在.env文件中设置OPENAI_API_KEY环境变量'
      };
    }
    try {
      const prompt = `
请审查以下${language}代码，提供改进建议：

\`\`\`${language}
${code}
\`\`\`

请从以下方面进行分析：
1. 代码质量和可读性
2. 性能优化建议
3. 安全性问题
4. 最佳实践建议
5. 潜在的错误和bug

请用中文回复。
      `;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的代码审查专家，擅长各种编程语言和最佳实践。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });

      return {
        success: true,
        review: response.choices[0].message.content,
        usage: response.usage
      };
    } catch (error) {
      logger.error('OpenAI代码审查失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 智能分析业务数据
   */
  async analyzeBusinessData(data: any, analysisType: string): Promise<any> {
    try {
      const prompt = `
请分析以下业务数据，提供智能洞察：

数据类型: ${analysisType}
数据内容: ${JSON.stringify(data, null, 2)}

请从以下方面进行分析：
1. 数据趋势和模式
2. 异常值和异常情况
3. 业务洞察和建议
4. 预测性分析
5. 优化建议

请用中文回复，并提供具体的数据支持。
      `;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的商业数据分析师，擅长从数据中提取有价值的洞察。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });

      return {
        success: true,
        analysis: response.choices[0].message.content,
        usage: response.usage
      };
    } catch (error) {
      logger.error('OpenAI业务数据分析失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 生成智能报告
   */
  async generateReport(data: any, reportType: string): Promise<any> {
    try {
      const prompt = `
请基于以下数据生成${reportType}报告：

数据: ${JSON.stringify(data, null, 2)}

报告要求：
1. 执行摘要
2. 关键指标分析
3. 趋势分析
4. 问题识别
5. 改进建议
6. 结论和下一步行动

请用中文生成专业的商业报告。
      `;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的商业分析师，擅长生成高质量的商业报告。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.3
      });

      return {
        success: true,
        report: response.choices[0].message.content,
        usage: response.usage
      };
    } catch (error) {
      logger.error('OpenAI报告生成失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 智能错误诊断
   */
  async diagnoseError(error: string, context: string): Promise<any> {
    try {
      const prompt = `
请诊断以下错误并提供解决方案：

错误信息: ${error}
上下文: ${context}

请提供：
1. 错误原因分析
2. 解决方案
3. 预防措施
4. 相关文档链接

请用中文回复。
      `;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的软件工程师，擅长错误诊断和问题解决。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
      });

      return {
        success: true,
        diagnosis: response.choices[0].message.content,
        usage: response.usage
      };
    } catch (error) {
      logger.error('OpenAI错误诊断失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 性能优化建议
   */
  async optimizePerformance(code: string, metrics: any): Promise<any> {
    try {
      const prompt = `
请分析以下代码的性能并提供优化建议：

代码:
\`\`\`typescript
${code}
\`\`\`

性能指标: ${JSON.stringify(metrics, null, 2)}

请提供：
1. 性能瓶颈分析
2. 优化建议
3. 代码重构建议
4. 最佳实践
5. 监控建议

请用中文回复。
      `;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的性能优化专家，擅长代码性能分析和优化。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });

      return {
        success: true,
        optimization: response.choices[0].message.content,
        usage: response.usage
      };
    } catch (error) {
      logger.error('OpenAI性能优化失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
}

export default OpenAIService;
