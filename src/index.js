// 网站的作用是通过我的网站域名加上需要代理的网址的完整链接，使得这个网址的流量全部经过我的网站给后端请求进行代理然后再返回给前端
// todo 去掉Origin 和 Referer
import { handleEvent } from './route.js';
import { initProxy, replaceWindowLocation, interceptHistory } from './client.js';
addEventListener('fetch', (event) => {
	event.respondWith(handle(event));
});
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
async function handle(event) {
	try {
		const request = event.request;
		const webRequestUrlObject = new URL(request.url);
		const prefix = `${webRequestUrlObject.origin}/`;

		if (excludedPaths.includes(webRequestUrlObject.pathname)) {
			//首页处理
			return handleEvent(event);
			// 将请求代理到 Cloudflare Pages 部署的网站
			// const pagesUrl = 'https://html.paperai.life'; // 将其替换为你的 Pages URL https://pages.paperai.life
			// return fetch(pagesUrl);
		}
		let actualUrlStr;
		if (!webRequestUrlObject.pathname.startsWith('/http')) {
			//从cookie中读取之前访问的网站，设置actualUrlStr
			const cookie = request.headers.get('Cookie');
			if (cookie) {
				const cookieObj = Object.fromEntries(
					cookie.split(';').map((cookie) => {
						const [key, ...val] = cookie.trim().split('=');
						return [key.trim(), val.join('=').trim()];
					})
				);
				if (cookieObj.current_site) {
					actualUrlStr =
						decodeURIComponent(cookieObj.current_site) +
						webRequestUrlObject.pathname +
						webRequestUrlObject.search +
						webRequestUrlObject.hash;
					console.log('actualUrlStr in cookieObj:', actualUrlStr);
					const actualUrl = new URL(actualUrlStr);
					const redirectUrl = `${prefix}${actualUrl}`;
					return Response.redirect(redirectUrl, 301);
				} else {
					// todo 改成html页面
					return new Response(
						`no website in cookie, Please visit a website first,cookie:${JSON.stringify(cookieObj)}, website: ${cookieObj.current_site}`,
						{
							status: 400,
							headers: { 'Content-Type': 'text/plain' },
						}
					);
				}
			} else {
				return new Response(`no cookie, Please visit a website first}`, {
					status: 400,
					headers: { 'Content-Type': 'text/plain' },
				});
			}
		} else {
			// 例如https://14790897.xyz/https://youtube.com 会访问 https://youtube.com
			actualUrlStr = webRequestUrlObject.pathname.replace('/', '') + webRequestUrlObject.search + webRequestUrlObject.hash; //使用的只有pathname
		}
		const actualUrlObject = new URL(actualUrlStr);
		console.log('actualUrlStr:', actualUrlStr);
		const actualOrigin = actualUrlObject.origin;
		const modifiedRequest = new Request(actualUrlObject, {
			headers: request.headers,
			method: request.method,
			body: request.body,
			redirect: 'follow',
		});

		let response = await fetch(modifiedRequest);
		const baseUrl = `${prefix}${actualOrigin}`; //前缀加上真实域名
		if (response.headers.get('Content-Type')?.includes('text/html')) {
			response = await updateRelativeUrls(response, baseUrl, prefix);
		}

		const modifiedResponse = new Response(response.body, response);
		// 删除 CSP 相关的响应头
		modifiedResponse.headers.delete('Content-Security-Policy');
		modifiedResponse.headers.delete('X-Content-Security-Policy');
		modifiedResponse.headers.delete('X-WebKit-CSP');
		modifiedResponse.headers.delete('Permissions-Policy');
		modifiedResponse.headers.set('X-Frame-Options', 'ALLOWALL');
		modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
		// modifiedResponse.headers.delete('Strict-Transport-Security'); // 强制使用 HTTPS
		// modifiedResponse.headers.delete('X-Download-Options'); // 防止 IE 下载危险文件
		// modifiedResponse.headers.delete('X-Content-Type-Options'); // 防止 MIME 类型嗅探
		// modifiedResponse.headers.delete('Referrer-Policy'); // 控制引用头部的发送
		// modifiedResponse.headers.delete('Feature-Policy'); // 控制特定功能使用的权限
		return modifiedResponse;
	} catch (e) {
		let pathname = new URL(event.request.url).pathname;
		return new Response(`"${pathname}" not found, error:${e}`, {
			status: 404,
			statusText: 'not found',
		});
	}
}

async function updateRelativeUrls(response, baseUrl, prefix) {
	let text = await response.text();
	// 找到所有以 http 开头的绝对路径，并在每个链接前加上 prefix
	// text = text.replace(/http[s]?:\/\/[^"'\s]+/g, (match) => {
	// 	console.log(`${prefix}${match}"`);
	// 	return `${prefix}${match}`;
	// });
	// text = text.replace(/http[s]?:\/\/(?![^<]*<\/(?:link|script)>)[^"'\s]+/g, (match) => {
	// 	console.log(`${prefix}${match}`);
	// 	return `${prefix}${match}`;
	// });
	// 替换HTML中的相对路径
	text = text.replace(/(href|src|action)="([^"]*?)"/g, (match, p1, p2) => {
		// 替换不完整链接
		if (!p2.startsWith('http') && !p2.startsWith('#')) {
			// baseUrl 是前缀加上真实域名，用于相对路径
			console.log(`${p1}="${baseUrl}${p2}"`);
			return `${p1}="${baseUrl}${p2}"`;
			// 替换以 http 或 https 开头的完整链接
		} else if (p2.startsWith('http')) {
			console.log(`${p1}="${prefix}${p2}"`);
			return `${p1}="${prefix}${p2}"`;
		}
		// 都不匹配就原样返回
		return match;
	});
	// 在 <head> 中插入 Service Worker 注册代码 //type="module"
	const swRegistrationScript = `
        <script>
                navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
                    console.log('Service Worker registered with scope:', registration.scope);
                }).catch(function(error) {
                    console.log('Service Worker registration failed:', error);
                });
			// 设置 Cookie 为当前用户所在网站的域名
          	const fullPath = location.pathname.replace('/', ''); // 获取路径部分并移除开头的 '/'
			const actualUrl = new URL(fullPath); // 使用路径创建一个新的 URL 对象
			const origin = actualUrl.origin; // 提取 origin 部分
			if (origin){document.cookie = "current_site=" + encodeURIComponent(origin) + "; Path=/; Secure";}
			${initProxy.toString() + replaceWindowLocation.toString() + interceptHistory.toString()}//这里脚本之后改成使用cdn加载
			initProxy(); // 这里调用 initProxy 函数
        </script>
    `;
	// import { replaceWindowLocation, replaceLinks } from '/utils.js'; //从根目录加载，但是utils重名了

	text = text.replace('</head>', `${swRegistrationScript}</head>`);
	const analyticsScript = `
<script async src="https://www.googletagmanager.com/gtag/js?id=G-N5PKF1XT49"></script>
<script>

</script>
		<script>
			window.dataLayer = window.dataLayer || [];
			function gtag() {
				dataLayer.push(arguments);
			}
			gtag('js', new Date());

			gtag('config', 'G-N5PKF1XT49');
		</script>
	`;
	text = text.replace('</body>', `${analyticsScript}</body>`);
	return new Response(text, {
		headers: response.headers,
	});
}
