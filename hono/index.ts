import { Hono } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
interface Env {
	MY_KV_NAMESPACE: KVNamespace;
	EVENT: FetchEvent;
}
const app = new Hono<{ Bindings: Env }>();

const excludedPaths = [
	'/',
	'/service-worker.js',
	'/favicon.ico',
	'/util.js',
	'/android-chrome-192x192.png',
	'/android-chrome-512x512.png',
	'/apple-touch-icon.png',
	'/favicon-16x16.png',
	'/favicon-32x32.png',
	'/manifest.json',
	'site.webmanifest',
];

// 处理排除的路径
excludedPaths.forEach((path) => {
	app.get(path, async (c) => {
		try {
			// 使用 getAssetFromKV 处理静态资源请求
			const response = await getAssetFromKV({
				request: c.req.raw,
				waitUntil: (promise: Promise<unknown>) => {
					// 这里你可以处理 promise
					promise.then(() => console.log('Promise resolved')).catch((err) => console.error('Promise rejected', err));
				},
			});
			return response;
		} catch (e) {
			// 如果找不到文件，返回 404
			return c.text(`404 - Not Found:${e}`, 404);
		}
	});
});

app.all('*', async (c) => {
	try {
		const request = c.req; // 使用 Hono 的请求对象
		const url = new URL(request.url);
		const prefix = `${url.origin}/`;

		let actualUrlStr;

		if (!url.pathname.startsWith('/http')) {
			// 处理非代理请求，通过 Cookie 中的记录获取实际网址
			const cookie = request.header('Cookie');
			if (cookie) {
				const cookieObj = Object.fromEntries(
					cookie.split(';').map((cookie) => {
						const [key, ...val] = cookie.trim().split('=');
						return [key.trim(), val.join('=').trim()];
					})
				);
				if (cookieObj.current_site) {
					actualUrlStr = `${decodeURIComponent(cookieObj.current_site)}${url.pathname}${url.search}${url.hash}`;
					console.log('actualUrlStr in cookieObj:', actualUrlStr);
					const actualUrl = new URL(actualUrlStr);
					const redirectUrl = `${prefix}${actualUrl}`;
					return c.redirect(redirectUrl, 301);
				} else {
					return c.text('No website in cookie. Please visit a website first.', 400);
				}
			} else {
				return c.text('No cookie found. Please visit a website first.', 400);
			}
		} else {
			// 处理代理请求
			actualUrlStr = url.pathname.replace('/', '') + url.search + url.hash;
		}

		const actualUrl = new URL(actualUrlStr);
		const actualOrigin = actualUrl.origin;

		// 克隆并修改请求头
		const newHeaders = new Headers(request.raw.headers);
		newHeaders.set('Referer', actualOrigin);
		newHeaders.set('Origin', actualOrigin);

		// 克隆请求并进行修改
		const modifiedRequest = new Request(actualUrl, {
			headers: newHeaders,
			method: request.method,
			body: request.method !== 'GET' && request.raw.body ? request.raw.body : null, // 只有非 GET 请求才包含 body
			redirect: 'follow',
		});

		// 发送请求并处理响应
		let response = await fetch(modifiedRequest);
		const baseUrl = `${prefix}${actualOrigin}`;

		// 如果是 HTML 内容，更新相对路径
		if (response.headers.get('Content-Type')?.includes('text/html')) {
			response = await updateRelativeUrls(response, baseUrl, prefix);
		}

		// 克隆并修改响应头
		const modifiedResponse = new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: filterResponseHeaders(response.headers),
		});
		// 将 Headers 转换为普通对象
		const headersObject = Object.fromEntries(modifiedResponse.headers.entries());
		return c.body(modifiedResponse.body, modifiedResponse.status as StatusCode, headersObject);
	} catch (error) {
		console.error('Error processing request:', error);
		return c.text('Internal Server Error', 500);
	}
});

// 过滤并修改响应头
function filterResponseHeaders(headers) {
	const newHeaders = new Headers(headers);
	newHeaders.delete('Content-Security-Policy');
	newHeaders.delete('X-Content-Security-Policy');
	newHeaders.delete('X-WebKit-CSP');
	newHeaders.delete('Permissions-Policy');
	newHeaders.set('X-Frame-Options', 'ALLOWALL');
	newHeaders.set('Access-Control-Allow-Origin', '*');
	newHeaders.delete('Strict-Transport-Security');
	newHeaders.delete('X-Download-Options');
	newHeaders.delete('X-Content-Type-Options');
	newHeaders.delete('Feature-Policy');
	return newHeaders;
}

// 更新 HTML 中的相对路径
async function updateRelativeUrls(response, baseUrl, prefix) {
	let text = await response.text();

	text = text.replace(/(href|src|action)="([^"]*?)"/g, (match, p1, p2) => {
		if (!p2.startsWith('http') && !p2.startsWith('#')) {
			return `${p1}="${baseUrl}${p2}"`;
		} else if (p2.startsWith('http')) {
			return `${p1}="${prefix}${p2}"`;
		}
		return match;
	});

	const swRegistrationScript = `
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
    `;
	text = text.replace('</head>', `${swRegistrationScript}</head>`);

	const analyticsScript = `
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
    `;
	text = text.replace('</body>', `${analyticsScript}</body>`);

	return new Response(text, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});
}

export default app;
