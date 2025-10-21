# OpenAI ⇆ Cursor ⇆ GitHub 协同工作流程

## 🎯 目标
建立完整的自动化协同工作流程，让OpenAI能够参与代码设计和修改，提高开发效率和代码质量。

## 🔄 工作流程
1. **GitHub推送** → 触发OpenAI分析仓库并生成补丁
2. **自动创建分支** → 推送新分支`ai/patch-xxxx`并保存补丁到`auto-patches/`
3. **本地守护脚本** → 自动拉取补丁并调用Cursor执行
4. **自动推送结果** → 执行结果自动推回GitHub，形成闭环

## 📁 文件结构
```
.github/workflows/
├── openai_autocommit.yml    # OpenAI自动分析工作流
└── ci.yml                   # CI构建测试工作流

scripts/
├── cursor_daemon.mjs        # Cursor守护进程
├── cursor-daemon.service    # systemd服务文件
└── start_daemon.sh         # 启动脚本

auto-patches/               # 自动生成的补丁目录
└── patch_*.md             # AI生成的补丁文件
```

## 🚀 使用步骤

### 1. 设置GitHub Secrets
在GitHub仓库设置中添加：
- `OPENAI_API_KEY`: 你的OpenAI API密钥

### 2. 提交协同工作文件
```bash
git add .github/workflows/ scripts/ OPENAI_COLLABORATION_GUIDE.md
git commit -m "feat: 添加OpenAI协同工作流程"
git push origin feature/ai-smart-system-clean
```

### 3. 启动本地守护进程

#### 方式1：使用pm2（推荐）
```bash
# 安装pm2
npm install -g pm2

# 启动守护进程
./scripts/start_daemon.sh

# 查看状态
pm2 status
pm2 logs cursor-daemon
```

#### 方式2：使用systemd（Linux服务器）
```bash
# 复制服务文件
sudo cp scripts/cursor-daemon.service /etc/systemd/system/

# 修改工作目录路径
sudo nano /etc/systemd/system/cursor-daemon.service

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable cursor-daemon
sudo systemctl start cursor-daemon
```

### 4. 验证协同工作
1. 推送任意修改到main分支
2. GitHub Action会自动触发OpenAI分析
3. 生成`ai/patch-xxxx`分支和补丁文件
4. 本地守护进程自动拉取并执行补丁
5. 结果自动推回GitHub

## 🔧 配置说明

### 环境变量
- `REPO_DIR`: 仓库根目录路径
- `CURSOR_CMD`: Cursor执行命令（默认：run-auto-commit）
- `POLL_MS`: 轮询间隔（默认30秒）

### 自定义配置
1. **修改分析范围**: 编辑`.github/workflows/openai_autocommit.yml`中的`globs`数组
2. **调整提示词**: 修改`user`变量中的任务描述
3. **更改轮询频率**: 修改`POLL_MS`环境变量

## 📊 监控和调试

### 查看守护进程状态
```bash
pm2 status
pm2 logs cursor-daemon --lines 50
```

### 手动触发分析
在GitHub仓库页面点击"Actions" → "OpenAI AutoCommit" → "Run workflow"

### 查看补丁文件
```bash
ls -la auto-patches/
cat auto-patches/patch_*.md
```

## 🛠️ 故障排除

### 常见问题
1. **OpenAI API配额不足**: 检查API密钥和配额
2. **Git推送失败**: 检查GitHub权限和网络连接
3. **守护进程无响应**: 检查pm2状态和日志
4. **补丁执行失败**: 检查Cursor命令是否正确

### 日志位置
- GitHub Actions: 仓库 → Actions → 具体工作流
- 本地守护进程: `pm2 logs cursor-daemon`
- 系统服务: `journalctl -u cursor-daemon`

## 🎉 效果展示
- ✅ 自动代码质量优化
- ✅ 智能错误修复
- ✅ 持续集成测试
- ✅ 无人值守运行
- ✅ 完整的变更追踪

## 📞 技术支持
如有问题，请检查：
1. GitHub Actions是否正常运行
2. 本地守护进程是否启动
3. OpenAI API密钥是否有效
4. 网络连接是否正常
