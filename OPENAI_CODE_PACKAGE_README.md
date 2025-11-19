# YYK热狗项目 - OpenAI代码包说明

## 📦 文件信息
- **文件名**: `yykhotdog_for_openai.zip`
- **大小**: 369MB
- **创建时间**: 2025-10-29 08:22
- **用途**: 提供给OpenAI分析的完整项目代码

## 🎯 项目概述
这是一个智能选址分析系统，主要功能包括：

### 核心功能
1. **智能选址分析** - 基于多维度数据的AI选址推荐
2. **GIS地图可视化** - 高德地图集成，展示候选铺位位置
3. **数据同步** - 从多个数据源同步铺位信息
4. **机器学习预测** - 使用ML模型预测铺位成功率
5. **批量分析** - 支持批量分析多个候选铺位

### 技术栈
- **前端**: React + TypeScript + Ant Design + 高德地图API
- **后端**: Node.js + Express + TypeScript + Sequelize
- **数据库**: SQL Server (MSSQL)
- **AI/ML**: 机器学习模型 + 智能分析算法

## 🔧 最近修复的问题
1. **Modal组件警告** - 修复了Antd Modal的`visible`属性警告
2. **高德地图API密钥** - 更新为有效的JS API密钥
3. **端口冲突** - 解决了前后端服务端口冲突问题
4. **前端缓存** - 清理了构建缓存，确保更新生效

## 📁 主要目录结构
```
yykhotdog/
├── frontend/                 # React前端应用
│   ├── src/pages/           # 页面组件
│   │   ├── GISMapView.tsx   # GIS地图可视化页面
│   │   ├── CandidateLocations.tsx  # 候选铺位管理
│   │   └── BatchAnalysis.tsx       # 批量分析页面
│   └── src/components/      # 通用组件
├── backend/                 # Node.js后端服务
│   ├── src/routes/         # API路由
│   ├── src/services/       # 业务逻辑服务
│   └── src/models/        # 数据模型
├── database/               # 数据库相关文件
└── scripts/               # 工具脚本
```

## 🚀 快速启动
1. **后端服务**: `cd backend && npm run dev`
2. **前端服务**: `cd frontend && npm start`
3. **访问地址**: http://localhost:3000

## 🎨 主要页面
- **GIS地图展示**: `/gis-map` - 高德地图可视化候选铺位
- **意向铺位管理**: `/candidate-locations` - 管理候选铺位数据
- **批量选址分析**: `/batch-analysis` - 批量分析功能
- **选址系统演示**: `/site-selection-demo` - 系统演示页面

## 🔑 关键配置
- **高德地图API密钥**: `6b338665ad02b0d321b851b35fc39acc`
- **后端端口**: 3001
- **前端端口**: 3000
- **数据库**: SQL Server (阿里云RDS)

## 📊 数据说明
- **候选铺位数据**: 274个意向铺位，包含位置、租金、面积等信息
- **分析结果**: 包含评分、预测收入、风险等级等AI分析结果
- **地理分布**: 主要覆盖大连、沈阳等城市

## ⚠️ 注意事项
1. 确保已安装Node.js 18+
2. 需要配置数据库连接信息
3. 高德地图API密钥已配置，可直接使用
4. 所有Modal组件已修复`visible`属性警告

## 🤖 OpenAI分析建议
建议OpenAI重点关注：
1. **GIS地图组件** (`frontend/src/pages/GISMapView.tsx`) - 地图可视化实现
2. **选址分析服务** (`backend/src/services/SiteSelectionService.ts`) - 核心业务逻辑
3. **机器学习服务** (`backend/src/services/MLSiteSelectionService.ts`) - AI预测算法
4. **API路由** (`backend/src/routes/siteSelection.ts`) - 接口设计

---
**创建时间**: 2025-10-29  
**版本**: 最新修复版本  
**状态**: 所有已知问题已修复，可正常运行
