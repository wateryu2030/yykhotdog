# 敏感文件清单

本文档列出了项目中所有需要配置的敏感文件。在新机器上拉取代码后，请根据此清单创建这些文件。

---

## 📁 文件位置说明

```
yykhotdog/
├── backend/
│   └── .env                    # 后端环境变量配置文件（最重要）
├── frontend/
│   └── src/config/
│       ├── amap.ts             # 高德地图API配置
│       └── api.ts              # API基础URL配置（通常不需要修改）
```

---

## 1. 后端环境变量配置

**文件路径:** `backend/.env`

**创建方式:**
```bash
cd backend
cp env.example .env
# 然后编辑 .env 文件，填入实际的配置值
```

### 必需配置项

#### 1.1 服务器配置
```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

#### 1.2 主数据库配置 (hotdog2030)
```env
DB_HOST=your_mssql_host          # MSSQL服务器地址（如：localhost 或 IP地址）
DB_PORT=1433                      # MSSQL端口（默认1433）
DB_USERNAME=sa                    # 数据库用户名
DB_PASSWORD=your_database_password # 数据库密码（重要：必须修改）
DB_NAME=hotdog2030                # 数据库名称
```

#### 1.3 货物数据库配置 (cyrg2025)
```env
CARGO_DB_HOST=your_mssql_host         # MSSQL服务器地址
CARGO_DB_PORT=1433                     # MSSQL端口
CARGO_DB_USER=sa                       # 数据库用户名
CARGO_DB_PASSWORD=your_cargo_password  # 数据库密码（重要：必须修改）
CARGO_DB_NAME=cyrg2025                 # 数据库名称
```

#### 1.4 微信数据库配置（可选，如果有）
```env
WECHAT_DB_HOST=your_mssql_host
WECHAT_DB_PORT=1433
WECHAT_DB_USER=sa
WECHAT_DB_PASSWORD=your_wechat_password
WECHAT_DB_NAME=cyrgweixin
```

#### 1.5 AI模型API密钥配置（重要）

##### OpenAI API
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini  # 可选，默认使用 gpt-4o-mini
```

##### 豆包API（字节跳动）
```env
DOUBAO_API_KEY=your_doubao_api_key
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3  # 可选，默认值
DOUBAO_MODEL=doubao-pro-32k  # 可选，需要替换为实际的endpoint ID
```

##### Gemini API（Google）
```env
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_MODEL=gemini-pro  # 可选，默认使用 gemini-pro
```

##### DeepSeek API
```env
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com  # 可选，默认值
DEEPSEEK_MODEL=deepseek-chat  # 可选，默认使用 deepseek-chat
```

**注意:** 至少配置一个AI模型的API密钥，系统会自动切换使用可用的模型。

#### 1.6 高德地图API配置
```env
AMAP_API_KEY=your_amap_api_key  # 从高德开放平台获取
```

#### 1.7 JWT配置
```env
JWT_SECRET=your_jwt_secret_key_here  # 用于生成JWT token的密钥（重要：必须修改）
JWT_EXPIRES_IN=7d  # Token过期时间
```

#### 1.8 阿里云配置（可选，如果需要使用阿里云服务）
```env
ALIYUN_ACCESS_KEY_ID=YOUR_ALIYUN_ACCESS_KEY_ID
ALIYUN_ACCESS_KEY_SECRET=YOUR_ALIYUN_ACCESS_KEY_SECRET
ALIYUN_REGION=cn-hangzhou

# MaxCompute配置（可选）
MAXCOMPUTE_PROJECT=zhhotdog_project
MAXCOMPUTE_ENDPOINT=https://service.cn.maxcompute.aliyun.com/api
```

#### 1.9 其他配置
```env
# 日志级别
LOG_LEVEL=info  # 可选值: debug, info, warn, error

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# SQLite配置（如果使用SQLite而不是MSSQL）
USE_SQLITE=false
SQLITE_PATH=./database/dev.sqlite
```

---

## 2. 前端配置文件

### 2.1 高德地图API配置

**文件路径:** `frontend/src/config/amap.ts`

**需要修改的内容:**
```typescript
export const AMAP_CONFIG = {
  key: 'your_amap_api_key_here',  // ⚠️ 修改为实际的高德地图API密钥
  version: '2.0',
  plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geocoder', 'AMap.PlaceSearch', 'AMap.Geolocation', 'AMap.MapType']
};
```

**获取方式:**
1. 访问 [高德开放平台](https://lbs.amap.com/)
2. 注册账号并登录
3. 进入「应用管理」-> 「我的应用」
4. 创建新应用或使用现有应用
5. 添加Key，选择「Web端(JS API)」
6. 复制Key值填入配置文件

### 2.2 API基础URL配置（可选）

**文件路径:** `frontend/src/config/api.ts`

**通常不需要修改**，除非后端服务地址不同：

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3001/api',  // 如果后端部署在其他地址，需要修改
  // ... 其他配置通常不需要修改
};
```

---

## 3. 快速配置检查清单

在新机器上拉取代码后，请按以下步骤检查：

- [ ] 1. 创建 `backend/.env` 文件
  - [ ] 配置数据库连接信息（DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD等）
  - [ ] 配置至少一个AI模型的API密钥（OPENAI_API_KEY 或 DOUBAO_API_KEY 等）
  - [ ] 配置AMAP_API_KEY（如果使用地图功能）
  - [ ] 配置JWT_SECRET（重要：必须修改为随机字符串）
  
- [ ] 2. 修改 `frontend/src/config/amap.ts`
  - [ ] 将 `key` 字段修改为实际的高德地图API密钥

- [ ] 3. 检查数据库连接
  ```bash
  cd backend
  npm install
  npm run test:db  # 如果有测试脚本
  ```

- [ ] 4. 启动后端服务
  ```bash
  cd backend
  npm install
  npm run dev
  ```

- [ ] 5. 启动前端服务
  ```bash
  cd frontend
  npm install
  npm start
  ```

---

## 4. 安全注意事项

⚠️ **重要安全提示:**

1. **不要将 `.env` 文件提交到Git仓库**
   - `.env` 文件已在 `.gitignore` 中，但请确认不要误提交
   - 如果误提交，立即修改密码和密钥

2. **不要在前端代码中硬编码API密钥**
   - 高德地图API密钥可以暴露在前端（这是正常的）
   - 但AI模型API密钥必须只配置在后端 `.env` 文件中

3. **定期轮换密钥和密码**
   - 建议定期更换数据库密码和JWT_SECRET
   - 如果API密钥泄露，立即更换

4. **使用环境变量管理敏感信息**
   - 生产环境建议使用环境变量管理工具（如AWS Secrets Manager、Azure Key Vault等）
   - 不要在代码中硬编码敏感信息

---

## 5. 配置文件模板示例

### backend/.env 完整模板

```env
# ==================== 服务器配置 ====================
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# ==================== 数据库配置 ====================
# 主数据库 (hotdog2030)
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=YourPassword123!
DB_NAME=hotdog2030

# 货物数据库 (cyrg2025)
CARGO_DB_HOST=localhost
CARGO_DB_PORT=1433
CARGO_DB_USER=sa
CARGO_DB_PASSWORD=YourPassword123!
CARGO_DB_NAME=cyrg2025

# ==================== AI模型API密钥 ====================
# OpenAI（推荐）
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini

# 豆包（字节跳动）
DOUBAO_API_KEY=your_doubao_api_key
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=doubao-pro-32k

# Gemini（Google）
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_MODEL=gemini-pro

# DeepSeek
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# ==================== 地图API ====================
AMAP_API_KEY=your_amap_api_key_here

# ==================== JWT配置 ====================
JWT_SECRET=your_random_secret_key_here_make_it_long_and_random
JWT_EXPIRES_IN=7d

# ==================== 日志配置 ====================
LOG_LEVEL=info

# ==================== 文件上传配置 ====================
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

---

## 6. 常见问题

### Q1: 如何测试数据库连接？
A: 在 `backend` 目录下运行测试脚本，或直接启动后端服务查看日志。

### Q2: AI模型API密钥从哪里获取？
A: 
- OpenAI: https://platform.openai.com/api-keys
- 豆包: https://console.volcengine.com/ark/
- Gemini: https://makersuite.google.com/app/apikey
- DeepSeek: https://platform.deepseek.com/api_keys

### Q3: 必须配置所有AI模型吗？
A: 不需要。至少配置一个即可，系统会自动选择可用的模型。建议配置OpenAI或豆包。

### Q4: 高德地图API密钥必须配置吗？
A: 如果使用地图功能（智能选址、GIS地图等），则必须配置。如果只使用数据分析功能，可以不配置。

### Q5: 如何生成JWT_SECRET？
A: 可以使用以下命令生成随机字符串：
```bash
# Linux/Mac
openssl rand -base64 32

# 或使用Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 7. 联系支持

如果遇到配置问题，请：
1. 检查本文档的配置说明
2. 查看项目README.md
3. 检查后端日志（`backend/logs/`）
4. 联系项目维护者

---

**最后更新时间:** 2024-11-19
**文档版本:** 1.0

