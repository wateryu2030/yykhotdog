import { OpenAI } from 'openai';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * AI代码生成服务
 * 提供智能代码生成、错误分析和自动修复功能
 */
export class AICodeGenerationService {
  private openai: OpenAI;
  private projectRoot: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy',
    });
    this.projectRoot = process.cwd();
  }

  /**
   * 根据需求描述生成代码
   */
  async generateCodeFromRequest(description: string, context?: string): Promise<string> {
    try {
      const prompt = this.buildCodeGenerationPrompt(description, context);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              '你是一个专业的TypeScript/React开发助手，专门为热狗连锁店管理系统生成高质量代码。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('AI代码生成失败:', error);
      return '';
    }
  }

  /**
   * 分析错误日志并提供修复建议
   */
  async analyzeAndFixError(errorLog: string, filePath?: string): Promise<string> {
    try {
      const context = filePath ? await this.getFileContext(filePath) : '';

      const prompt = `分析以下错误日志并提供修复代码：

错误日志：
${errorLog}

${context ? `相关文件内容：\n${context}` : ''}

请提供：
1. 错误原因分析
2. 修复代码
3. 预防措施

只返回修复代码，不要包含解释文字。`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              '你是一个专业的错误分析和代码修复专家，专门处理TypeScript/Node.js项目中的错误。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1500,
        temperature: 0.2,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('AI错误分析失败:', error);
      return '';
    }
  }

  /**
   * 自动执行代码修复
   */
  async executeAutoFix(errorLog: string, filePath?: string): Promise<boolean> {
    try {
      const fixCode = await this.analyzeAndFixError(errorLog, filePath);

      if (!fixCode) {
        console.log('未生成修复代码');
        return false;
      }

      // 保存修复代码到临时文件
      const tempFile = path.join(this.projectRoot, 'temp_fix.ts');
      fs.writeFileSync(tempFile, fixCode);

      console.log('生成的修复代码已保存到:', tempFile);
      console.log('请手动检查并应用修复代码');

      return true;
    } catch (error) {
      console.error('自动修复执行失败:', error);
      return false;
    }
  }

  /**
   * 分析项目历史并生成优化建议
   */
  async analyzeRepositoryHistory(): Promise<string> {
    try {
      // 获取最近的提交记录
      const gitLog = execSync('git log --oneline -20', { encoding: 'utf-8' });

      const prompt = `分析以下Git提交记录，为热狗连锁店管理系统项目生成优化建议：

提交记录：
${gitLog}

请提供：
1. 代码质量改进建议
2. 架构优化建议
3. 性能优化建议
4. 最佳实践建议`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              '你是一个专业的代码审查和项目优化专家，专门分析TypeScript/React项目的代码质量和架构。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('项目历史分析失败:', error);
      return '';
    }
  }

  /**
   * 生成API接口代码
   */
  async generateAPICode(endpoint: string, description: string): Promise<string> {
    const prompt = `为热狗连锁店管理系统生成API接口代码：

接口路径: ${endpoint}
功能描述: ${description}

请生成完整的Express.js路由代码，包括：
1. 请求参数验证
2. 数据库查询
3. 错误处理
4. 响应格式

使用TypeScript和Sequelize ORM。`;

    return await this.generateCodeFromRequest(prompt);
  }

  /**
   * 生成React组件代码
   */
  async generateReactComponent(componentName: string, description: string): Promise<string> {
    const prompt = `为热狗连锁店管理系统生成React组件：

组件名称: ${componentName}
功能描述: ${description}

请生成完整的React组件代码，包括：
1. TypeScript类型定义
2. Ant Design组件使用
3. 状态管理
4. 事件处理
5. 样式定义

使用React 18和Ant Design 5。`;

    return await this.generateCodeFromRequest(prompt);
  }

  /**
   * 构建代码生成提示
   */
  private buildCodeGenerationPrompt(description: string, context?: string): string {
    return `根据以下需求为热狗连锁店管理系统生成代码：

需求描述：
${description}

${context ? `项目上下文：\n${context}` : ''}

要求：
1. 使用TypeScript
2. 遵循最佳实践
3. 包含完整的错误处理
4. 代码要有良好的注释
5. 符合项目现有的代码风格

只返回代码，不要包含解释文字。`;
  }

  /**
   * 获取文件上下文
   */
  private async getFileContext(filePath: string): Promise<string> {
    try {
      const fullPath = path.join(this.projectRoot, filePath);
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf-8');
      }
      return '';
    } catch (error) {
      console.error('读取文件上下文失败:', error);
      return '';
    }
  }
}

// 导出单例实例
export const aiCodeService = new AICodeGenerationService();
