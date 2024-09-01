const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

// 配置代理服务
const proxyConfig = [
  {
    path: "/service1", // 代理路径前缀
    target: "http://192.168.1.100:3001", // 内网服务1的地址
  },
  {
    path: "/service2", // 代理路径前缀
    target: "http://192.168.1.101:3002", // 内网服务2的地址
  },
];

const app = express();

// 设置代理中间件
proxyConfig.forEach((service) => {
  app.use(
    service.path,
    createProxyMiddleware({
      target: service.target,
      changeOrigin: true,
      pathRewrite: (path, req) => path.replace(service.path, ""), // 删除路径前缀
    })
  );
});

// 主页路由
app.get("/", (req, res) => {
  res.send(`
        <h1>内网服务反向代理</h1>
        <ul>
            <li><a href="/service1">访问服务1</a></li>
            <li><a href="/service2">访问服务2</a></li>
        </ul>
    `);
});

// 启动服务器
const PORT = 8080; // 你可以根据需要修改端口
app.listen(PORT, () => {
  console.log(`代理服务器已启动，监听端口 ${PORT}`);
});
