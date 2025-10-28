# 项目清理总结

## 清理时间
2025-10-28

## 清理目标
简化项目根目录结构，归档临时文件和旧文件，只保留核心文件

## 清理结果

### 归档文件统计
- **脚本文件**: 31个（已移至 archive/scripts/）
- **报告文件**: 45个（已移至 archive/reports/）
- **备份文件**: 13个（已移至 archive/backups/）

### 保留的核心文件
- README.md
- USER_MANUAL.md
- Schema文件: cyrg2025_schema.sql, cyrgweixin_schema.sql, hotdog2030_schema.sql
- 启动脚本: dev-start.sh, start-system.sh, start_backend.sh
- 配置文件: dev.env, deploy.env, docker-compose.yml等

### 项目结构
```
├── archive/          # 归档的旧文件
│   ├── scripts/      # 临时和测试脚本
│   ├── reports/      # 旧的报告文档
│   └── backups/      # 备份文件
├── backend/          # 后端代码
├── frontend/         # 前端代码
├── database/         # 数据库脚本
├── docs/             # 文档
└── ...               # 其他目录
```

## 效果
✅ 项目根目录清晰，只显示核心文件
✅ 所有历史文件已安全归档
✅ 便于后续维护和开发
