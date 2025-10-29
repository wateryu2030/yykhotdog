/**
 * ETL管理API路由
 * 提供ETL框架的前端接口
 */
import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);
const router = Router();

// ETL步骤配置
const ETL_STEPS = [
  { id: 1, name: 'extract_orders', description: '订单数据提取', status: 'pending' },
  { id: 2, name: 'extract_order_items', description: '订单明细提取', status: 'pending' },
  { id: 3, name: 'extract_stores', description: '门店信息提取', status: 'pending' },
  { id: 4, name: 'extract_products', description: '商品信息提取', status: 'pending' },
  { id: 5, name: 'extract_customers', description: '客户信息提取', status: 'pending' },
  { id: 6, name: 'profit_analysis', description: '利润分析', status: 'pending' },
  { id: 7, name: 'customer_segmentation', description: '客户细分分析', status: 'pending' },
  { id: 8, name: 'forecast_sales', description: '销售预测', status: 'pending' },
  { id: 9, name: 'site_selection', description: '智能选址分析', status: 'pending' },
  { id: 10, name: 'dashboard_metrics', description: '仪表板指标聚合', status: 'pending' },
];

// 获取ETL状态
router.get('/status', async (req: Request, res: Response) => {
  try {
    // 获取项目根目录（从backend/dist目录往上）
    const projectRoot = path.resolve(__dirname, '../../..');
    const etlPath = path.join(projectRoot, 'etl');

    // 检查ETL目录是否存在
    if (!fs.existsSync(etlPath)) {
      return res.json({
        success: false,
        message: 'ETL框架未找到',
        steps: ETL_STEPS,
      });
    }

    // 检查各个步骤文件是否存在
    const stepsWithStatus = ETL_STEPS.map(step => {
      const scriptPath = path.join(
        etlPath,
        'steps',
        `${step.id.toString().padStart(2, '0')}_${step.name}.py`
      );
      return {
        ...step,
        status: fs.existsSync(scriptPath) ? 'ready' : 'missing',
        scriptPath: scriptPath,
      };
    });

    res.json({
      success: true,
      message: 'ETL状态获取成功',
      steps: stepsWithStatus,
      etlPath: etlPath,
    });
  } catch (error) {
    console.error('获取ETL状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取ETL状态失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 执行单个ETL步骤
router.post('/execute/:stepId', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;
    const step = ETL_STEPS.find(s => s.id === parseInt(stepId));

    if (!step) {
      return res.status(400).json({
        success: false,
        message: '无效的步骤ID',
      });
    }

    // 获取项目根目录（从backend/dist目录往上）
    const projectRoot = path.resolve(__dirname, '../../..');
    const etlPath = path.join(projectRoot, 'etl');
    const scriptPath = path.join(etlPath, 'steps', `${stepId.padStart(2, '0')}_${step.name}.py`);

    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({
        success: false,
        message: 'ETL脚本文件不存在',
      });
    }

    console.log(`开始执行ETL步骤 ${stepId}: ${step.description}`);

    // 执行Python脚本 - 使用python3
    const { stdout, stderr } = await execAsync(`python3 "${scriptPath}"`, {
      cwd: etlPath,
      timeout: 300000, // 5分钟超时
    });

    console.log(`ETL步骤 ${stepId} 执行完成`);
    console.log('输出:', stdout);
    if (stderr) console.log('错误:', stderr);

    res.json({
      success: true,
      message: `ETL步骤 ${stepId} 执行完成`,
      step: step,
      output: stdout,
      error: stderr,
    });
  } catch (error) {
    console.error(`ETL步骤 ${req.params.stepId} 执行失败:`, error);
    res.status(500).json({
      success: false,
      message: 'ETL步骤执行失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 执行完整ETL流程
router.post('/execute-all', async (req: Request, res: Response) => {
  try {
    // 获取项目根目录（从backend/dist目录往上）
    const projectRoot = path.resolve(__dirname, '../../..');
    const etlPath = path.join(projectRoot, 'etl');
    const runScriptPath = path.join(etlPath, 'run_etl.py');

    if (!fs.existsSync(runScriptPath)) {
      return res.status(404).json({
        success: false,
        message: 'ETL主执行脚本不存在',
      });
    }

    console.log('开始执行完整ETL流程');

    // 执行完整ETL流程 - 使用python3
    const { stdout, stderr } = await execAsync(`python3 "${runScriptPath}"`, {
      cwd: etlPath,
      timeout: 1800000, // 30分钟超时
    });

    console.log('完整ETL流程执行完成');
    console.log('输出:', stdout);
    if (stderr) console.log('错误:', stderr);

    res.json({
      success: true,
      message: '完整ETL流程执行完成',
      output: stdout,
      error: stderr,
    });
  } catch (error) {
    console.error('完整ETL流程执行失败:', error);
    res.status(500).json({
      success: false,
      message: '完整ETL流程执行失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取ETL日志
router.get('/logs', async (req: Request, res: Response) => {
  try {
    // 获取项目根目录（从backend/dist目录往上）
    const projectRoot = path.resolve(__dirname, '../../..');
    const etlPath = path.join(projectRoot, 'etl');
    const logFiles = [];

    // 查找日志文件
    if (fs.existsSync(etlPath)) {
      const files = fs.readdirSync(etlPath);
      const logFiles = files.filter(file => file.endsWith('.log'));

      res.json({
        success: true,
        message: 'ETL日志获取成功',
        logs: logFiles.map(file => ({
          name: file,
          path: path.join(etlPath, file),
          size: fs.statSync(path.join(etlPath, file)).size,
        })),
      });
    } else {
      res.json({
        success: false,
        message: 'ETL目录不存在',
        logs: [],
      });
    }
  } catch (error) {
    console.error('获取ETL日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取ETL日志失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

// 获取数据统计
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // 这里可以添加数据库查询来获取数据统计
    // 暂时返回模拟数据
    res.json({
      success: true,
      message: '数据统计获取成功',
      stats: {
        totalOrders: 0,
        totalStores: 0,
        totalCustomers: 0,
        totalProducts: 0,
        lastSyncTime: null,
      },
    });
  } catch (error) {
    console.error('获取数据统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据统计失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

export default router;
