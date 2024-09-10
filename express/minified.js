import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// 代理所有路径请求
app.use('/*', (req, res, next) => {
	const targetUrl = req.originalUrl.substring(1); // 从路径中提取目标 URL (去掉前面的 '/')
	console.log(`targetUrl: ${targetUrl},req.path:${req.originalUrl}`);
	try {
		const urlObj = new URL(targetUrl); // 检查是否是合法的 URL
		console.log('Proxying request to:', urlObj.href);

		// 代理请求
		createProxyMiddleware({
			target: `${urlObj.protocol}//${urlObj.host}`, // 代理到目标网站
			changeOrigin: true, // 更改主机头为目标服务器
			pathRewrite: {
				[`^/${targetUrl}`]: '', // 移除URL的前缀，保持目标服务器的路径不变
			},
		})(req, res, next);
	} catch (err) {
		console.error('Invalid URL:', targetUrl);
		res.status(400).send('Invalid URL');
	}
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Proxy server running on port ${PORT}`);
});
