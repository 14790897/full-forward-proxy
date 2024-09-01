import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

// 创建一个忽略自签名证书的 HTTPS Agent
const httpsAgent = new https.Agent({
	rejectUnauthorized: false,
});
// 创建支持 HTTP 协议的 Agent
const httpAgent = new http.Agent();
// __dirname and __filename are not available in ES modules, so you need to recreate them
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// 使用中间件解析 Cookie
app.use(cookieParser());
app.use(express.json()); // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true })); // 解析 URL 编码请求体
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// 处理所有其他请求
app.all('*', async (req, res) => {
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
		console.log('actualUrlStr:', actualUrlStr);
		const actualOrigin = actualUrlObject.origin;

		const newHeaders = { ...req.headers };
		newHeaders['Referer'] = actualOrigin;
		newHeaders['Origin'] = actualOrigin;
		const agent = actualUrlObject.protocol === 'https:' ? httpsAgent : httpAgent;
		const response = await fetch(actualUrlObject.href, {
			method: req.method,
			headers: newHeaders,
			body: req.method !== 'GET' ? req.body : undefined,
			redirect: 'follow',
			agent,
		});

		let responseBody = await response.text();

		// 更新 HTML 中的相对路径
		if (response.headers.get('content-type')?.includes('text/html')) {
			responseBody = updateRelativeUrls(responseBody, prefix, actualOrigin);
		}

		// 克隆并修改响应头
		const modifiedHeaders = filterResponseHeaders(response.headers);

		// 删除 CSP 相关的响应头
		res.set(modifiedHeaders);

		// 发送响应
		res.status(response.status).send(responseBody);
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
                c[a]=c[a]||function(){(c[a].q=c[a.q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "nt4hmun44h");
        </script>
        </body>
    `
		);
}

// 过滤并修改响应头
function filterResponseHeaders(headers) {
	const newHeaders = {};
	headers.forEach((value, key) => {
		if (
			![
				'Content-Security-Policy',
				'X-Content-Security-Policy',
				'X-WebKit-CSP',
				'Permissions-Policy',
				'Strict-Transport-Security',
				'X-Download-Options',
				'X-Content-Type-Options',
				'Feature-Policy',
			].includes(key)
		) {
			newHeaders[key] = value;
		}
	});
	newHeaders['X-Frame-Options'] = 'ALLOWALL';
	newHeaders['Access-Control-Allow-Origin'] = '*';
	return newHeaders;
}

// 监听端口
const PORT = process.env.PORT || 8686;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
