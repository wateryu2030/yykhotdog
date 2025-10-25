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
import path from 'path';

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
import aiInsightsRoutes from './routes/aiInsights';
import aiAssistantRoutes from './routes/aiAssistant';

// 加载环境变量 - 修复路径
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('服务启动');
console.log('环境变量检查:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USERNAME:', process.env.DB_USERNAME);

const app = express();
const PORT = process.env['PORT'] || 3001;

// 中间件配置
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制每个IP 15分钟内最多100个请求
});
app.use('/api/', limiter);

// Swagger配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '全国智能化热狗管理平台 API',
      version: '1.0.0',
      description: '热狗管理平台后端API文档'
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: '开发服务器'
      }
    ]
  },
  apis: ['./src/routes/*.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API路由
app.use('/api/customer-profile', customerProfileRoutes);
app.use('/api/region', regionRoutes);
app.use('/api/school-management', schoolManagementRoutes);
app.use('/api/check-database', checkDatabaseRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/sales-prediction', salesPredictionRoutes);
app.use('/api/etl-management', etlManagementRoutes);
app.use('/api/ai-insights', aiInsightsRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);

// 错误处理
app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app);

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
  logger.info('收到 SIGTERM 信号，开始优雅关闭...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信号，开始优雅关闭...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

startServer();
