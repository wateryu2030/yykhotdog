import schedule from 'node-schedule';
import axios from 'axios';

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3001';

const run = async (name: string, path: string) => {
  try {
    console.log(`🚀 [Scheduler] 触发任务：${name}`);
    const r = await axios.post(`${BASE_URL}${path}`);
    console.log(`✅ [Scheduler] ${name} 成功:`, r.data);
  } catch (err: any) {
    console.error(`⚠️ [Scheduler] ${name} 失败:`, err.message);
  }
};

export const initScheduler = () => {
  // 每日 02:00 自动运行预测与洞察
  schedule.scheduleJob('0 2 * * *', async () => {
    await run('AI预测任务', '/api/ai/forecast/product/run');
    await run('AI洞察更新', '/api/ai-insights/insight/product');
  });

  // 每小时检查异常情况
  schedule.scheduleJob('0 * * * *', async () => {
    await run('AI异常检测', '/api/ai/alert/summary');
  });

  // 每周日 03:00 进行模型性能评估
  schedule.scheduleJob('0 3 * * 0', async () => {
    await run('AI模型性能评估', '/api/ai/model/evaluate');
  });

  console.log('🕐 [Scheduler] 初始化自动任务调度器...');
  console.log('✅ [Scheduler] 自动任务调度器已启动');
  console.log('📅 调度计划:');
  console.log('  - 每日 02:00: AI预测 + 洞察更新');
  console.log('  - 每小时: 异常检测');
  console.log('  - 每周日 03:00: 模型性能评估');
};
