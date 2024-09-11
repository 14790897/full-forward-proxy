# 使用官方 node 镜像作为基础镜像
FROM node:18

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./
RUN npm install -g wrangler

# 安装依赖项
RUN npm install

# 将应用的所有文件复制到工作目录
COPY . .

# 暴露端口以便调试
EXPOSE 8787

# 启动 wrangler dev
CMD ["wrangler", "dev"]
