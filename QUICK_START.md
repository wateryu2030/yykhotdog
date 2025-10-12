# 快速开始指南

## 🚀 一键初始化数据库

### 1. 准备工作

```bash
# 确保 Docker 运行
docker ps | grep sqlserver

# 如果未运行，启动容器
docker-compose up -d sqlserver

# 确保备份文件在 database 目录
ls -lh database/*.bak
```

### 2. 执行初始化

```bash
# 给脚本执行权限（首次运行）
chmod +x restore-and-init-complete.sh

# 执行一键初始化
./restore-and-init-complete.sh
```

**就这么简单！**脚本会自动完成：
- ✅ 恢复 cyrg2025 和 cyrgweixin 数据库
- ✅ 创建 hotdog2030 分析数据库
- ✅ 迁移所有数据（门店、订单、商品明细等）
- ✅ 应用所有数据修复
- ✅ 验证数据完整性

### 3. 启动服务

```bash
# 启动后端（新终端窗口）
cd backend && npm run dev

# 启动前端（新终端窗口）
cd frontend && npm start

# 访问系统
open http://localhost:3000
```

## 📊 验证功能

### 测试数据下钻功能

1. 访问"门店开业" → 点击任意门店
2. 点击"查看订单明细"
3. 点击任意订单的"查看详情"
4. 查看订单的**商品明细**列表 ✨

### 测试 API

```bash
# 测试订单商品明细 API
curl "http://localhost:3001/api/operations/orders/156045/items" | jq

# 测试运营概览 API
curl "http://localhost:3001/api/operations/overview?startDate=2025-10-11&endDate=2025-10-11" | jq
```

## 🔍 查看日志

初始化过程会生成详细日志：

```bash
# 查看最新的日志文件
ls -lt init_hotdog2030_*.log | head -1

# 查看日志内容
tail -f init_hotdog2030_YYYYMMDD_HHMMSS.log
```

## 📝 常见命令

### 数据库操作

```bash
# 进入 SQL Server 容器
docker exec -it yylkhotdog-sqlserver-1 bash

# 使用 sqlcmd
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -C

# 查询示例
SELECT name FROM sys.databases;
USE hotdog2030;
SELECT COUNT(*) FROM order_items WHERE delflag = 0;
```

### 服务管理

```bash
# 查看运行中的服务
ps aux | grep -E "(node|npm)" | grep -v grep

# 停止前端
pkill -f "react-scripts start"

# 停止后端
pkill -f "nodemon src/index.ts"

# 重启 Docker 服务
docker-compose restart sqlserver
```

## 🆘 快速故障排查

| 问题 | 解决方案 |
|------|----------|
| 容器未运行 | `docker-compose up -d sqlserver` |
| 备份文件未找到 | 检查 `database/*.bak` 文件是否存在 |
| Python 依赖缺失 | `pip3 install pyodbc` |
| 端口被占用 | 停止相关进程或修改端口配置 |

## 📚 更多文档

- 详细初始化指南：`DATABASE_INIT_GUIDE.md`
- 完整方案总结：`COMPLETE_SOLUTION_SUMMARY.md`
- 更新日志：`CHANGELOG.md`

---

**提示**: 每次获取新的备份文件后，只需重新运行 `./restore-and-init-complete.sh` 即可完成全部更新！

