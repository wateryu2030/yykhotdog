import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import http from 'http';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { connectDatabase } from './config/database';

// 路由导入
import customerProfileRoutes from './routes/customerProfile';
import regionRoutes from './routes/region';
import schoolManagementRoutes from './routes/schoolManagement';
import checkDatabaseRoutes from './routes/checkDatabase';
import operationsRoutes from './routes/operations';
import salesPredictionRoutes from './routes/salesPrediction';
import etlManagementRoutes from './routes/etlManagement';

// 加载环境变量
dotenv.config({ path: '../deploy.env' });

console.log('服务启动');

const app = express();
const PORT = process.env['PORT'] || 3001;

// 设置trust proxy以支持X-Forwarded-For头
app.set('trust proxy', 1);

// 创建自定义HTTP服务器，设置更大的请求头限制
const server = http.createServer({
  maxHeaderSize: 256 * 1024, // 256KB header limit (increased from 64KB)
}, app);

// 安全中间件
app.use(helmet());

// CORS配置
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'User-Agent']
}));

// 请求限制 - 差异化限流策略
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 200, // 限制每个IP 15分钟内最多200个请求
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});

// AI API专用限流 - 更宽松，支持批量调用
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 500, // AI API限制更宽松，支持批量学校信息查询
  message: 'AI服务请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});

// 地图API专用限流 - 支持批量POI搜索
const mapLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 300, // 地图API中等限制，支持批量POI搜索
  message: '地图服务请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});

// 销售预测API专用限流 - 更宽松
const predictionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 预测API限制更宽松
  message: '预测服务请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});

// 仪表板API专用限流
const dashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 150, // 仪表板API中等限制
  message: '仪表板请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});

// 增强学校分析API专用限流 - 支持大量学校数据查询
const enhancedSchoolAnalysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 学校分析API限制更宽松，支持大量数据查询
  message: JSON.stringify({
    success: false,
    message: '学校分析请求过于频繁，请稍后再试',
    error: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15分钟'
  }),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: '学校分析请求过于频繁，请稍后再试',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15分钟',
      timestamp: new Date().toISOString()
    });
  }
});

// 应用限流中间件
app.use('/api/', generalLimiter);
app.use('/api/ai', aiLimiter);
app.use('/api/map', mapLimiter);
app.use('/api/sales-prediction', predictionLimiter);
app.use('/api/operations/dashboard', dashboardLimiter);
app.use('/api/enhanced-school-analysis', enhancedSchoolAnalysisLimiter);

// 压缩响应
app.use(compression() as any);

// 日志中间件
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '全国智能化热狗管理平台 API',
      version: '1.0.0',
      description: '基于本地SQL Server数据库的智能化热狗管理平台API文档',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: '开发环境',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // API路由文件路径
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve as any, swaggerUi.setup(swaggerSpec) as any);

// 健康检查
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development'
  });
});

// API路由
logger.info('正在注册API路由...');
app.use('/api/customer-profile', customerProfileRoutes);
app.use('/api/region', regionRoutes);
app.use('/api/school-management', schoolManagementRoutes);
app.use('/api/check-database', checkDatabaseRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/sales-prediction', salesPredictionRoutes);
app.use('/api/etl', etlManagementRoutes);

// 404处理
app.use(notFoundHandler);

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    await connectDatabase();
    logger.info('数据库连接成功');

    // 启动服务器
    server.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`服务器运行在端口 ${PORT}`);
      logger.info(`API文档地址: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

startServer(); 