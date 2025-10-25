# OpenAI集成开发环境使用指南

## 🚀 项目概述

本项目已成功集成OpenAI API，实现了ChatGPT、GitHub和Cursor之间的联动开发。通过AI助手，开发者可以获得智能代码审查、数据分析、错误诊断等功能。

## 📋 功能特性

### 1. AI开发助手功能
- **代码审查**: 智能分析代码质量，提供改进建议
- **数据分析**: 业务数据智能分析，提取洞察
- **报告生成**: 自动生成专业商业报告
- **错误诊断**: 智能错误分析和解决方案
- **性能优化**: 代码性能分析和优化建议
- **代码生成**: 根据需求自动生成代码
- **文档生成**: 自动生成API文档和技术文档

### 2. 集成开发工作流
- **Cursor IDE**: 本地代码编辑和开发
- **ChatGPT**: AI代码审查和智能建议
- **GitHub**: 代码版本控制和协作
- **自动化测试**: GitHub Actions自动测试和部署

## 🛠️ 环境配置

### 1. 环境变量设置
```bash
# OpenAI API配置
export OPENAI_API_KEY="your-openai-api-key"
export OPENAI_ORG_ID="your-openai-org-id"
export OPENAI_MODEL="gpt-3.5-turbo"

# 数据库配置
export DB_HOST="rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com"
export DB_PORT="1433"
export DB_USERNAME="hotdog"
export DB_PASSWORD="Zhkj@62102218"
export DB_NAME="hotdog2030"
```

### 2. 依赖安装
```bash
# 后端依赖
cd backend
npm install openai

# 前端依赖
cd frontend
npm install
```

## 🚀 快速开始

### 1. 启动服务
```bash
# 启动后端服务
cd backend
npm run dev

# 启动前端服务
cd frontend
npm start
```

### 2. 访问AI功能
- **主应用**: http://localhost:3000
- **AI洞察**: http://localhost:3000/ai-insights
- **AI助手**: http://localhost:3000/ai-assistant
- **API文档**: http://localhost:3001/api-docs

## 📚 使用指南

### 1. 代码审查
1. 访问 `/ai-assistant` 页面
2. 选择"代码审查"标签
3. 选择编程语言
4. 粘贴要审查的代码
5. 点击"开始审查"按钮
6. 查看AI分析结果

### 2. 数据分析
1. 选择"数据分析"标签
2. 选择分析类型（业务/技术/性能/用户）
3. 输入JSON格式的数据
4. 点击"开始分析"按钮
5. 查看智能分析结果

### 3. 报告生成
1. 选择"报告生成"标签
2. 选择报告类型
3. 输入数据内容
4. 点击"生成报告"按钮
5. 获取专业报告

### 4. 错误诊断
1. 选择"错误诊断"标签
2. 输入错误信息
3. 提供上下文信息（可选）
4. 点击"诊断错误"按钮
5. 获取解决方案

## 🔧 API端点

### AI助手相关
- `POST /api/ai-assistant/code-review` - 代码审查
- `POST /api/ai-assistant/analyze-data` - 数据分析
- `POST /api/ai-assistant/generate-report` - 报告生成
- `POST /api/ai-assistant/diagnose-error` - 错误诊断
- `POST /api/ai-assistant/optimize-performance` - 性能优化
- `POST /api/ai-assistant/generate-code` - 代码生成
- `POST /api/ai-assistant/generate-docs` - 文档生成

### 请求示例
```javascript
// 代码审查
const response = await fetch('http://localhost:3001/api/ai-assistant/code-review', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    code: 'function add(a, b) { return a + b; }',
    language: 'javascript'
  })
});

const result = await response.json();
console.log(result.review);
```

## 🎯 最佳实践

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

## 🔍 故障排除

### 常见问题
1. **OpenAI API连接失败**
   - 检查API密钥是否正确
   - 确认网络连接正常
   - 验证API配额是否充足

2. **AI助手功能无响应**
   - 检查后端服务是否运行
   - 验证API端点是否正确
   - 查看浏览器控制台错误

3. **数据分析失败**
   - 确认数据格式为JSON
   - 检查数据内容是否有效
   - 验证分析类型是否正确

## 📈 开发工作流

### 1. 本地开发
```bash
# 1. 在Cursor中编写代码
# 2. 使用AI助手进行代码审查
# 3. 修复AI建议的问题
# 4. 提交到GitHub
```

### 2. 协作开发
```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发功能
# 3. 使用AI助手审查代码
# 4. 提交代码
git add .
git commit -m "feat: 添加新功能"
git push origin feature/new-feature

# 5. 创建Pull Request
# 6. 使用ChatGPT进行代码审查
# 7. 合并到主分支
```

### 3. 自动化部署
- GitHub Actions自动测试
- 代码质量检查
- 自动部署到生产环境

## 🤝 贡献指南

### 1. 代码提交
```bash
git add .
git commit -m "feat: 添加新功能"
git push origin main
```

### 2. 代码审查
- 使用AI助手进行代码审查
- 遵循项目编码规范
- 添加必要的测试用例

### 3. 文档更新
- 更新API文档
- 维护README文件
- 记录变更日志

## 📞 技术支持

- **项目仓库**: https://github.com/wateryu2030/yykhotdog
- **问题反馈**: 通过GitHub Issues提交
- **技术文档**: 查看项目文档目录
- **AI助手**: 使用内置AI助手获取帮助

## 🎉 总结

通过OpenAI集成，本项目实现了：
- 智能代码审查和优化
- 自动化数据分析
- 智能错误诊断
- 代码生成和文档生成
- ChatGPT、GitHub和Cursor的联动开发

这将大大提高开发效率，减少人工错误，提升代码质量。
