# 运行意向铺位同步脚本说明

## 问题说明
脚本需要 `mssql` 模块，该模块已安装在 `backend/node_modules` 中。脚本已修改为能够从 backend 目录加载依赖。

## 运行方式

### 方式一：从项目根目录运行（推荐）
```bash
cd /Users/apple/Ahope/yykhotdog
node sync_candidate_locations.js
```

脚本会自动从 `backend/node_modules` 加载 `mssql` 模块。

### 方式二：从 backend 目录运行
```bash
cd /Users/apple/Ahope/yykhotdog/backend
node ../sync_candidate_locations.js
```

### 方式三：使用 NODE_PATH 环境变量
```bash
cd /Users/apple/Ahope/yykhotdog
NODE_PATH=./backend/node_modules node sync_candidate_locations.js
```

## 脚本功能

1. **从 cyrgweixin.Rg_SeekShop 同步数据到 hotdog2030.candidate_locations**
   - 自动解析 location 字段中的经纬度（支持 "经度,纬度" 格式）
   - 插入时自动写入 longitude 和 latitude 字段

2. **自动补齐已有数据的经纬度**
   - 同步完成后，自动检查 candidate_locations 表中缺失经纬度的记录
   - 从 location 字段解析经纬度并更新

3. **日志输出**
   - 显示同步进度
   - 显示成功/失败数量
   - 显示补齐的经纬度记录数量

## 环境变量

确保 `.env` 文件或环境变量中包含以下配置：
- `DB_HOST`: hotdog2030 数据库主机
- `DB_USERNAME`: 数据库用户名
- `DB_PASSWORD`: 数据库密码
- `CARGO_DB_HOST`: cyrgweixin 数据库主机（可选，默认与 DB_HOST 相同）

## 预期结果

运行成功后：
- 所有从 cyrgweixin 同步的记录都会包含 longitude 和 latitude
- 历史记录中缺失坐标的数据会被自动补齐
- 前端地图视图能够正常显示所有铺位标记

