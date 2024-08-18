import { handleEvent } from './route.js';

addEventListener('fetch', (event) => {
	event.respondWith(handle(event));
});

async function handle(event) {
	try {
		const request = event.request;
		const url = new URL(request.url);

		if (url.pathname === '/' || url.pathname === '/service-worker.js') {
			//首页处理
			return handleEvent(event);
			// 将请求代理到 Cloudflare Pages 部署的网站
			// const pagesUrl = 'https://html.paperai.life'; // 将其替换为你的 Pages URL https://pages.paperai.life
			// return fetch(pagesUrl);
		}
		let actualUrlStr;
		if (!url.pathname.startsWith('/proxy/')) {
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
					actualUrlStr = decodeURIComponent(cookieObj.current_site) + url.pathname + url.search + url.hash;
					console.log('actualUrlStr in cookieObj:', actualUrlStr);
					const actualUrl = new URL(actualUrlStr);
					const redirectUrl = `${url.origin}/proxy/${actualUrl}`;
					return Response.redirect(redirectUrl, 301);
				} else {
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
			// 例如https://14790897.xyz/proxy/https://youtube.com 会访问 https://youtube.com
			actualUrlStr = url.pathname.replace('/proxy/', '') + url.search + url.hash; //使用的只有pathname
		}
		const actualUrl = new URL(actualUrlStr);
		console.log('actualUrlStr:', actualUrlStr);
		const actualOrigin = actualUrl.origin;
		const modifiedRequest = new Request(actualUrl, {
			headers: request.headers,
			method: request.method,
			body: request.body,
			redirect: 'follow',
		});

		let response = await fetch(modifiedRequest);
		const baseUrl = `${url.origin}/proxy/${actualOrigin}`; //前缀加上真实域名
		if (response.headers.get('Content-Type')?.includes('text/html')) {
			response = await updateRelativeUrls(response, baseUrl, `${url.origin}/proxy/`);
		}

		const modifiedResponse = new Response(response.body, response);
		modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
		// 使用一个cookie来记录当前访问的网站
		const currentSiteCookie = `current_site=${encodeURIComponent(actualUrl.origin)}; Path=/;  Secure`;
		modifiedResponse.headers.append('Set-Cookie', currentSiteCookie);
		return modifiedResponse;
	} catch (e) {
		let pathname = new URL(event.request.url).pathname;
		return new Response(`"${pathname}" not found`, {
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
	// 替换HTML中的相对路径, 不能替换action，会报错: 请enable cookie
	text = text.replace(/(href|src|action)="([^"]*?)"/g, (match, p1, p2) => {
		// 替换不完整链接
		if (!p2.includes('://') && !p2.startsWith('#')) {
			// baseurl是前缀加上真实域名
			console.log(`${p1}="${baseUrl}${p2}"`);
			return `${p1}="${baseUrl}${p2}"`;
			// 替换https的完整链接
		} else if (p2.includes('://') && !match.includes('js')&& !match.includes('css') && !match.includes('mjs')) {
			console.log(`${p1}="${prefix}${p2}"`);
			return `${p1}="${prefix}${p2}"`;
		}
		// 都不匹配就原样返回
		return match;
	});
	return new Response(text, {
		headers: response.headers,
	});
}
