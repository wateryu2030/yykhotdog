/**
 * 多AI模型服务
 * 支持自动切换：OpenAI -> 豆包 -> Gemini -> DeepSeek
 * 当一个大模型失败时，自动切换到下一个模型
 */
import OpenAI from 'openai';
import { logger } from '../utils/logger';

// AI模型类型
export type AIModel = 'openai' | 'doubao' | 'gemini' | 'deepseek';

// AI模型配置接口
interface AIModelConfig {
  name: string;
  enabled: boolean;
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

// 多AI服务类
export class MultiAIService {
  private models: Map<AIModel, AIModelConfig>;
  private clients: Map<AIModel, any>;
  private defaultOrder: AIModel[] = ['openai', 'doubao', 'gemini', 'deepseek'];

  constructor() {
    this.models = new Map();
    this.clients = new Map();
    this.initializeModels();
    this.initializeClients();
  }

  /**
   * 初始化模型配置
   */
  private initializeModels() {
    // OpenAI配置
    const openaiKey = process.env.OPENAI_API_KEY;
    this.models.set('openai', {
      name: 'OpenAI',
      enabled: !!openaiKey && openaiKey !== 'dummy',
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    });

    // 豆包配置（字节跳动）
    const doubaoKey = process.env.DOUBAO_API_KEY;
    // 豆包API使用OpenAI兼容接口，baseURL格式：https://ark.{region}.volces.com/api/v3
    // 模型名称格式：ep-{endpoint_id}，需要根据实际创建的endpoint调整
    this.models.set('doubao', {
      name: '豆包',
      enabled: !!doubaoKey && doubaoKey !== 'dummy',
      apiKey: doubaoKey,
      baseURL: process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
      model: process.env.DOUBAO_MODEL || 'doubao-pro-32k' // 需要替换为实际的endpoint ID
    });

    // Gemini配置
    const geminiKey = process.env.GEMINI_API_KEY;
    this.models.set('gemini', {
      name: 'Gemini',
      enabled: !!geminiKey && geminiKey !== 'dummy',
      apiKey: geminiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
      model: process.env.GEMINI_MODEL || 'gemini-pro'
    });

    // DeepSeek配置
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    this.models.set('deepseek', {
      name: 'DeepSeek',
      enabled: !!deepseekKey && deepseekKey !== 'dummy',
      apiKey: deepseekKey,
      baseURL: 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
    });

    // 记录启用的模型
    const enabledModels = Array.from(this.models.values())
      .filter(m => m.enabled)
      .map(m => m.name);
    logger.info(`多AI模型服务初始化完成，启用的模型: ${enabledModels.join(', ') || '无'}`);
  }

  /**
   * 初始化客户端
   */
  private initializeClients() {
    // OpenAI客户端
    const openaiConfig = this.models.get('openai');
    if (openaiConfig?.enabled && openaiConfig.apiKey) {
      this.clients.set('openai', new OpenAI({
        apiKey: openaiConfig.apiKey
      }));
    }

    // 豆包客户端（使用OpenAI兼容接口）
    const doubaoConfig = this.models.get('doubao');
    if (doubaoConfig?.enabled && doubaoConfig.apiKey && doubaoConfig.baseURL) {
      this.clients.set('doubao', new OpenAI({
        apiKey: doubaoConfig.apiKey,
        baseURL: doubaoConfig.baseURL
      }));
    }

    // Gemini客户端（需要特殊处理）
    // 注意：Gemini使用REST API，不使用OpenAI SDK
    const geminiConfig = this.models.get('gemini');
    if (geminiConfig?.enabled && geminiConfig.apiKey) {
      this.clients.set('gemini', {
        apiKey: geminiConfig.apiKey,
        baseURL: geminiConfig.baseURL,
        model: geminiConfig.model
      });
    }

    // DeepSeek客户端（使用OpenAI兼容接口）
    const deepseekConfig = this.models.get('deepseek');
    if (deepseekConfig?.enabled && deepseekConfig.apiKey && deepseekConfig.baseURL) {
      this.clients.set('deepseek', new OpenAI({
        apiKey: deepseekConfig.apiKey,
        baseURL: deepseekConfig.baseURL
      }));
    }
  }

  /**
   * 调用OpenAI模型（带超时控制）
   */
  private async callOpenAI(
    client: OpenAI,
    model: string,
    messages: Array<{ role: string; content: string }>,
    temperature: number = 0.7,
    maxTokens: number = 500,
    timeout: number = 30000 // 默认30秒超时
  ): Promise<string> {
    // 创建超时Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`AI请求超时（${timeout / 1000}秒）`)), timeout);
    });

    // 创建实际的API调用Promise
    const apiPromise = client.chat.completions.create({
      model,
      messages: messages as any,
      temperature,
      max_tokens: maxTokens
    }).then(response => response.choices[0]?.message?.content || '');

    // 使用Promise.race实现超时控制
    try {
      const content = await Promise.race([apiPromise, timeoutPromise]);
      if (!content) {
        throw new Error('AI返回内容为空');
      }
      return content;
    } catch (error: any) {
      // 如果是超时错误，明确提示
      if (error.message?.includes('超时') || error.message?.includes('timeout')) {
        throw new Error(`AI请求超时（${timeout / 1000}秒），请稍后重试`);
      }
      throw error;
    }
  }

  /**
   * 调用Gemini模型（使用REST API，带超时控制）
   */
  private async callGemini(
    config: any,
    prompt: string,
    temperature: number = 0.7,
    maxTokens: number = 500,
    timeout: number = 30000 // 默认30秒超时
  ): Promise<string> {
    // Gemini API v1beta格式
    const url = `${config.baseURL}/models/${config.model}:generateContent?key=${config.apiKey}`;
    
    try {
      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              topP: 0.95,
              topK: 40
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Gemini API错误: ${response.status}`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error?.message || errorText;
          } catch {
            errorMessage = `${errorMessage} - ${errorText}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json() as any;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
          throw new Error('Gemini返回内容为空');
        }
        
        return text;
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        // 如果是超时错误
        if (error.name === 'AbortError' || error.message?.includes('timeout')) {
          throw new Error(`Gemini请求超时（${timeout / 1000}秒），请稍后重试`);
        }
        
        throw error;
      }
    } catch (error: any) {
      // 重新抛出错误，让上层处理
      throw error;
    }
  }

  /**
   * 调用AI模型（自动切换）
   * 添加超时和重试机制
   */
  async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      modelOrder?: AIModel[];
      timeout?: number; // 每个模型调用的超时时间（毫秒）
      maxRetries?: number; // 最大重试次数
    } = {}
  ): Promise<{ content: string; model: AIModel; error?: string }> {
    const {
      temperature = 0.7,
      maxTokens = 500,
      modelOrder = this.defaultOrder,
      timeout = 30000, // 默认30秒超时
      maxRetries = 1 // 每个模型最多重试1次
    } = options;

    const errors: Array<{ model: AIModel; error: string }> = [];

    // 按顺序尝试每个模型
    for (const modelType of modelOrder) {
      const modelConfig = this.models.get(modelType);
      
      // 跳过未启用的模型
      if (!modelConfig?.enabled) {
        logger.debug(`跳过未启用的模型: ${modelConfig?.name || modelType}`);
        continue;
      }

      try {
        logger.info(`尝试使用 ${modelConfig.name} 模型...`);
        let content = '';

        switch (modelType) {
          case 'openai':
          case 'doubao':
          case 'deepseek': {
            const client = this.clients.get(modelType);
            if (!client) {
              throw new Error(`${modelConfig.name}客户端未初始化`);
            }
            content = await this.callOpenAI(
              client,
              modelConfig.model || 'gpt-4o-mini',
              messages,
              temperature,
              maxTokens,
              timeout
            );
            break;
          }

          case 'gemini': {
            // Gemini需要将消息转换为单个prompt
            const prompt = messages
              .map(m => `${m.role === 'system' ? '系统' : m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
              .join('\n\n');
            const geminiConfig = this.clients.get('gemini');
            if (!geminiConfig) {
              throw new Error('Gemini客户端未初始化');
            }
            content = await this.callGemini(
              geminiConfig,
              prompt,
              temperature,
              maxTokens,
              timeout
            );
            break;
          }

          default:
            throw new Error(`不支持的模型类型: ${modelType}`);
        }

        if (content && content.trim()) {
          logger.info(`✅ ${modelConfig.name} 模型调用成功`);
          return { content: content.trim(), model: modelType };
        } else {
          throw new Error('返回内容为空');
        }
      } catch (error: any) {
        const errorMessage = error?.message || '未知错误';
        const errorCode = error?.status || error?.code || 'UNKNOWN';
        
        logger.warn(`❌ ${modelConfig.name} 模型调用失败:`, {
          error: errorMessage,
          code: errorCode
        });

        errors.push({
          model: modelType,
          error: `${modelConfig.name}: ${errorMessage}`
        });

        // 判断是否应该继续尝试下一个模型
        // 如果是认证错误（401），跳过该模型
        // 如果是频率限制（429），继续尝试下一个模型
        // 如果是服务器错误（5xx），继续尝试下一个模型
        if (errorCode === 401) {
          logger.warn(`跳过 ${modelConfig.name}（认证失败）`);
          continue;
        }

        // 其他错误继续尝试下一个模型
        continue;
      }
    }

    // 所有模型都失败了
    const errorSummary = errors.map(e => e.error).join('; ');
    throw new Error(`所有AI模型调用失败: ${errorSummary}`);
  }

  /**
   * 获取可用的模型列表
   */
  getAvailableModels(): Array<{ type: AIModel; name: string; enabled: boolean }> {
    return Array.from(this.models.entries()).map(([type, config]) => ({
      type,
      name: config.name,
      enabled: config.enabled
    }));
  }

  /**
   * 检查是否有可用的模型
   */
  hasAvailableModel(): boolean {
    return Array.from(this.models.values()).some(m => m.enabled);
  }
}

// 导出单例
export const multiAIService = new MultiAIService();

