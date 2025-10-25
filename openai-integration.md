# OpenAI集成开发环境设置

## 概述
本项目已成功集成OpenAI API，支持ChatGPT、GitHub和Cursor之间的联动开发。

## 环境配置

### 1. OpenAI API配置
```bash
# 设置环境变量
export OPENAI_API_KEY="your-openai-api-key"
export OPENAI_ORG_ID="your-openai-org-id"
```

### 2. 项目结构
```
yykhotdog/
├── .github/workflows/
│   └── openai-integration.yml    # GitHub Actions工作流
├── backend/
│   ├── src/services/
│   │   └── OpenAIService.ts      # OpenAI服务集成
│   └── src/routes/
│       └── aiInsights.ts          # AI洞察API路由
├── frontend/
│   ├── src/components/
│   │   ├── AIInsights.tsx         # AI洞察组件
│   │   └── EnhancedAIInsights.tsx # 增强AI洞察组件
│   └── src/pages/
│       └── AIInsightsPage.tsx     # AI洞察页面
└── openai-integration.md          # 本文档
```

## 功能特性

### 1. AI洞察分析
- 利润分析数据可视化
- 客户细分智能分析
- 销售预测AI模型
- 站点评分智能评估

### 2. 智能开发助手
- 代码智能补全
- 错误诊断和修复建议
- 性能优化建议
- 代码质量分析

### 3. 数据驱动决策
- 实时业务洞察
- 预测性分析
- 异常检测
- 趋势分析

## 使用方法

### 1. 启动开发环境
```bash
# 启动后端服务
cd backend
npm run dev

# 启动前端服务
cd frontend
npm start
```

### 2. 访问AI功能
- 仪表板: http://localhost:3000
- AI洞察: http://localhost:3000/ai-insights
- API文档: http://localhost:3001/api-docs

### 3. 集成开发工作流
1. 在Cursor中编写代码
2. 使用ChatGPT进行代码审查
3. 通过GitHub Actions自动测试
4. 部署到生产环境

## API端点

### AI洞察相关
- `GET /api/ai-insights/dashboard-metrics` - 仪表板指标
- `GET /api/ai-insights/profit-analysis` - 利润分析
- `GET /api/ai-insights/customer-segments` - 客户细分
- `GET /api/ai-insights/sales-forecasts` - 销售预测
- `GET /api/ai-insights/site-scores` - 站点评分

### 开发工具
- `POST /api/ai/code-review` - 代码审查
- `POST /api/ai/optimization` - 性能优化建议
- `POST /api/ai/error-analysis` - 错误分析

## 开发最佳实践

### 1. 代码质量
- 使用TypeScript进行类型安全
- 遵循ESLint规则
- 编写单元测试
- 使用Prettier格式化代码

### 2. AI集成
- 合理使用AI API调用
- 缓存AI响应结果
- 处理API限制和错误
- 保护敏感数据

### 3. 性能优化
- 使用React.memo优化渲染
- 实现代码分割
- 优化API调用
- 监控性能指标

## 故障排除

### 常见问题
1. **OpenAI API连接失败**
   - 检查API密钥是否正确
   - 确认网络连接正常
   - 验证API配额是否充足

2. **AI洞察数据加载失败**
   - 检查数据库连接
   - 验证数据表结构
   - 查看API日志

3. **前端代理错误**
   - 确认后端服务运行
   - 检查端口配置
   - 验证API路径

## 贡献指南

### 1. 代码提交
```bash
git add .
git commit -m "feat: 添加新功能"
git push origin main
```

### 2. 代码审查
- 使用ChatGPT进行代码审查
- 遵循项目编码规范
- 添加必要的测试用例

### 3. 文档更新
- 更新API文档
- 维护README文件
- 记录变更日志

## 联系信息
- 项目维护者: wateryu2030
- GitHub仓库: https://github.com/wateryu2030/yykhotdog
- 问题反馈: 通过GitHub Issues提交
