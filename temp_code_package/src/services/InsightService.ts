// 智能洞察服务 - 多模型兜底支持
import { logger } from '../utils/logger';

type InsightInput = {
  summary: any;
  cities: any[];
  stores: any[];
  trends?: any[];
};

type InsightOutput = {
  provider: string;
  content: string;
};

// 尝试调用AI服务
async function tryFetch(url: string, init: RequestInit): Promise<any> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(10000), // 10秒超时
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    logger.error(`AI请求失败 (${url}):`, error);
    throw error;
  }
}

export async function generateInsights(payload: InsightInput): Promise<InsightOutput> {
  const textPrompt = `
你是餐饮连锁零售的数据分析师。基于"销售额、订单数、销量、毛利率"的城市/门店数据，输出三部分：
1) 亮点：表现最好的城市/门店和高毛利商品机会
2) 风险：下滑或低毛利的城市/门店/商品
3) 建议：可执行的营销/商品结构/价格与补货建议（分城市/门店）
数据(简要JSON)：${JSON.stringify(payload).slice(0, 6000)}
请用简体中文，列表化，尽量具体（如"周三/下午，推套餐A+饮料，目标提升15%"）。
`.trim();

  // 1) OpenAI
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (OPENAI_API_KEY) {
    try {
      const data = await tryFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'user', content: textPrompt }],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) {
        logger.info('使用 OpenAI 生成洞察');
        return { provider: 'openai', content };
      }
    } catch (error) {
      logger.warn('OpenAI 调用失败，尝试其他模型');
    }
  }

  // 2) 通义千问
  const QWEN_API_KEY = process.env.QWEN_API_KEY;
  if (QWEN_API_KEY) {
    try {
      const data = await tryFetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${QWEN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.QWEN_MODEL || 'qwen-plus',
          messages: [{ role: 'user', content: textPrompt }],
          temperature: 0.3,
        }),
      });
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) {
        logger.info('使用通义千问生成洞察');
        return { provider: 'qwen', content };
      }
    } catch (error) {
      logger.warn('通义千问调用失败，尝试其他模型');
    }
  }

  // 3) DeepSeek
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (DEEPSEEK_API_KEY) {
    try {
      const data = await tryFetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
          messages: [{ role: 'user', content: textPrompt }],
          temperature: 0.3,
        }),
      });
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) {
        logger.info('使用 DeepSeek 生成洞察');
        return { provider: 'deepseek', content };
      }
    } catch (error) {
      logger.warn('DeepSeek 调用失败');
    }
  }

  // 4) 规则引擎兜底（无AI模型可用时）
  logger.info('无可用AI模型，使用规则引擎生成洞察');
  const bestCity = payload.cities?.[0];
  const worstCity = [...(payload.cities || [])].sort((a: any, b: any) => (a.profitMargin || 0) - (b.profitMargin || 0))[0];
  const bestStore = payload.stores?.[0];
  const totalRevenue = payload.summary?.totalRevenue || 0;
  const avgMargin = payload.cities?.reduce((sum: number, c: any) => sum + (c.profitMargin || 0), 0) / (payload.cities?.length || 1);

  const tips = [
    '工作日午晚高峰（11:30-13:30 / 17:30-20:00）主推套餐，提高客单价',
    '对"高销量低毛利"的商品做轻微提价或与高毛利品打包',
    '对"低销量高毛利"的品类做陈列与试吃',
    '按城市差异化菜单（甜口/辣口/加料），减少统一化折损',
  ];

  const content = `【经营洞察报告】（规则引擎生成）

📊 总体表现
- 总销售额：¥${totalRevenue.toLocaleString()}
- 平均毛利率：${avgMargin.toFixed(1)}%
- 城市覆盖：${payload.cities?.length || 0}个

⭐ 亮点
${bestCity ? `- ${bestCity.city} 销售额领先，达到 ¥${(bestCity.totalRevenue || 0).toLocaleString()}，毛利率 ${(bestCity.profitMargin || 0).toFixed(1)}%` : ''}
${bestStore ? `- 表现最佳门店：${bestStore.store_name}（销售额 ¥${(bestStore.totalRevenue || 0).toLocaleString()}）` : ''}

⚠️ 风险
${worstCity ? `- ${worstCity.city} 毛利偏低（${(worstCity.profitMargin || 0).toFixed(1)}%），需优化价格与供应链` : ''}

💡 营销建议
${tips.map(tip => `- ${tip}`).join('\n')}
`;

  return { provider: 'rule', content };
}

