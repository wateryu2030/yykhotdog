FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装所有依赖（包括开发依赖用于构建）
RUN npm ci

# 复制源代码
COPY . .

# 创建日志和上传目录
RUN mkdir -p logs uploads

# 暴露端口
EXPOSE 3001

# 启动应用 (直接使用ts-node)
CMD ["npx", "ts-node", "src/index.ts"] 