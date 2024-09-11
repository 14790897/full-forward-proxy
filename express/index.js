// 网站的作用是通过我的网站域名加上需要代理的网址的完整链接，使得这个网址的流量全部经过我的网站给后端请求进行代理然后再返回给前端，如当用户访问 http://localhost:3000/https://google.com 时，自动代理到 https://google.com 网站
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import proxy from 'express-http-proxy'; // 引入 express-http-proxy

// __dirname and __filename are not available in ES modules, so you need to recreate them
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
import compression from 'compression';
app.use(compression());
// 使用中间件解析 Cookie
app.use(cookieParser());
app.use(express.json()); // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true })); // 解析 URL 编码请求体
app.use(
	express.static(path.join(__dirname, '..', 'frontend'), {
		maxAge: '1d', // 静态文件缓存 1 天,
		lastModified: true, // 启用 Last-Modified
		etag: true, // 使用 ETag 标识资源是否更新
	})
);

// 处理所有其他请求
app.all('*', (req, res, next) => {
	try {
		const webRequestUrlObject = new URL(req.url, `${req.protocol}://${req.headers.host}`);

		const prefix = `${webRequestUrlObject.origin}/`;

		let actualUrlStr;

		if (!webRequestUrlObject.pathname.startsWith('/http')) {
			const cookie = req.cookies;
			if (cookie && cookie.current_site) {
				actualUrlStr =
					decodeURIComponent(cookie.current_site) + webRequestUrlObject.pathname + webRequestUrlObject.search + webRequestUrlObject.hash;
				console.log('actualUrlStr in cookie:', actualUrlStr);
				const actualUrl = new URL(actualUrlStr);
				const redirectUrl = `${prefix}${actualUrl}`;
				res.redirect(302, redirectUrl);
				return;
			} else {
				res.status(400).send(`No website in cookie. Please visit a website first.`);
				return;
			}
		} else {
			actualUrlStr = webRequestUrlObject.pathname.replace('/', '') + webRequestUrlObject.search + webRequestUrlObject.hash;
		}
		const actualUrlObject = new URL(actualUrlStr);
		const actualOrigin = actualUrlObject.origin;

		const baseUrl = `${prefix}${actualOrigin}`; //前缀加上真实域名

		console.log('actualUrlStr:', actualUrlStr);
		const proxyMiddleware = proxy(actualOrigin, {
			proxyReqPathResolver: (req) => {
				const path = req.url;
				return path.startsWith(`/${actualOrigin}`) ? path.replace(`/${actualOrigin}`, '') : path;
			},
			proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
				proxyReqOpts.headers['Host'] = new URL(actualOrigin).host;
				return proxyReqOpts;
			},
			userResDecorator: async (proxyRes, proxyResData, req, res) => {
				const contentType = proxyRes.headers['content-type'] || '';
				if (proxyRes.headers['location']) {
					// 删除 'Location' 头，防止重定向
					delete proxyRes.headers['location'];
					res.statusCode = 200;
				}

				res.removeHeader('Location');
				res.removeHeader('Content-Security-Policy');
				res.removeHeader('X-Content-Security-Policy');
				res.removeHeader('X-WebKit-CSP');
				res.removeHeader('Permissions-Policy');
				res.removeHeader('Strict-Transport-Security');
				res.removeHeader('X-Download-Options');
				res.removeHeader('X-Content-Type-Options');
				res.removeHeader('Feature-Policy');

				res.setHeader('X-Frame-Options', 'ALLOWALL');
				res.setHeader('Access-Control-Allow-Origin', '*');

				if (contentType.includes('text/html')) {
					let responseBody = proxyResData.toString('utf8');
					const updatedBody = updateRelativeUrls(responseBody, baseUrl, prefix); // 更新 HTML 中的相对 URL
					return updatedBody;
				} else {
					return proxyResData; // 其他类型的响应保持不变
				}
			},
		});

		proxyMiddleware(req, res, next); // 继续代理请求
	} catch (e) {
		console.error('Error processing request:', e);
		res.status(499).send(`Internal Server Error: ${e}`);
	}
});

// 更新 HTML 中的相对路径
function updateRelativeUrls(text, baseUrl, prefix) {
	return text
		.replace(/(href|src|action)="([^"]*?)"/g, (match, p1, p2) => {
			if (!p2.startsWith('http') && !p2.startsWith('#')) {
				return `${p1}="${baseUrl}${p2}"`;
			} else if (p2.startsWith('http')) {
				return `${p1}="${prefix}${p2}"`;
			}
			return match;
		})
		.replace(
			'</head>',
			`
	    <script>
	        navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
	            console.log('Service Worker registered with scope:', registration.scope);
	        }).catch(function(error) {
	            console.log('Service Worker registration failed:', error);
	        });
	        navigator.serviceWorker.addEventListener('message', (event) => {
	            const currentSite = event.data.currentSite;
	            if (currentSite) {
	                document.cookie = "current_site=" + currentSite + "; path=/; Secure";
	                console.log('current_site saved to cookie in index:', currentSite);
	            }
	        });
	    </script>
	    </head>
	`
		)
		.replace(
			'</body>',
			`
				<script async src="https://www.googletagmanager.com/gtag/js?id=G-N5PKF1XT49"></script>
		<script>
			window.dataLayer = window.dataLayer || [];
			function gtag() {
				dataLayer.push(arguments);
			}
			gtag('js', new Date());

			gtag('config', 'G-N5PKF1XT49');
			(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "nt4hmun44h");
		</script>
	</body>
	`
		);
}

// 监听端口
const PORT = process.env.PORT || 8686;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
