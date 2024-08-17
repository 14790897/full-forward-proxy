// public/service-worker.js
self.addEventListener('install', (event) => {
	console.log('Service Worker installing...');
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	console.log('Service Worker activating...');
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
	const requestUrl = new URL(event.request.url); // 请求的域名
	const originUrl = new URL(self.location.href); //当前所在的网站的域名的url对象
	const domain = originUrl.origin; //当前所在的网站的域名
	const prefix = `${domain}/proxy/`;
	// console.log('prefix:', prefix, 'requestUrl:', requestUrl.url);
	if (requestUrl.pathname === '/' || requestUrl.pathname === '/service-worker.js') {
		event.respondWith(fetch(event.request)); // 直接传递给worker
	}
	// 如果请求路径不以 '/proxy/' 开头，需要从cookie获得域名
	if (!requestUrl.pathname.startsWith('/proxy/')) {

		// 从请求头中获取 Cookie
		const cookie = event.request.headers.get('Cookie');
		console.log('Request does not start with /proxy/. Checking cookies..., requestUrl.origin:', requestUrl.origin, 'cookie:',cookie);

		if (cookie) {
			// 解析 Cookie 为对象
			const cookieObj = Object.fromEntries(
				cookie.split(';').map((cookie) => {
					const [key, ...val] = cookie.trim().split('=');
					return [key.trim(), val.join('=').trim()];
				})
			);
			console.log('cookieObj.current_site:', cookieObj.current_site);
			if (cookieObj.current_site) {
				// 如果 current_site 存在，从中构造实际的 URL
				const actualUrlStr = decodeURIComponent(cookieObj.current_site) + requestUrl.pathname + requestUrl.search + requestUrl.hash;
				console.log('actualUrlStr in cookieObj:', actualUrlStr);
				const actualUrl = new URL(actualUrlStr);

				// 构造重定向 URL
				const redirectUrl = `${prefix}${actualUrl.href}`;
				console.log('Redirecting to in cookie:', redirectUrl);

				// 响应重定向
				event.respondWith(Response.redirect(redirectUrl, 301));
				return;
			} else {
				// 如果 Cookie 中没有 current_site
				console.log('No website in cookie, Please visit a website first');
				event.respondWith(
					new Response(
						`No website in cookie, Please visit a website first, cookie: ${JSON.stringify(cookieObj)}, website: ${cookieObj.current_site}`,
						{
							status: 400,
							headers: { 'Content-Type': 'text/plain' },
						}
					)
				);
				return;
			}
		} else {
			console.log('No cookie, Please visit a website first');
			return new Response(`no cookie, Please visit a website first}`, {
				status: 400,
				headers: { 'Content-Type': 'text/plain' },
			});
		}
	}
	// 如果请求的域名不以prefix开头，说明他请求了外部的服务那个服务是一个完整的链接，则加上前缀，使得可以代理
	else if (!requestUrl.href.startsWith(prefix) ) {
		const modifiedUrl = prefix + requestUrl.href;
		console.log('URL does not start with prefix. Adding prefix and redirecting...,modifiedUrl:', modifiedUrl);
		const modifiedRequestInit = {
			method: event.request.method,
			headers: event.request.headers,
			body: event.request.body,
			mode: event.request.mode,
			credentials: event.request.credentials,
			cache: event.request.cache,
			redirect: event.request.redirect,
			referrer: event.request.referrer,
			integrity: event.request.integrity,
		};

		// 如果有 body，设置 duplex: 'half'
		if (event.request.body) {
			modifiedRequestInit.duplex = 'half';
		}

		// 这里重定向到新的 URL
		const redirectUrl = new URL(modifiedUrl);
		const redirectResponse = Response.redirect(redirectUrl, 302);
		// const modifiedRequest = new Request(modifiedUrl, modifiedRequestInit);
		event.respondWith(redirectResponse);
		// event.respondWith(fetch(modifiedRequest));
		return;
	} else {
		console.log('Passing through unmodified request. 未更改，requestUrl.href：', requestUrl.href);
		event.respondWith(fetch(event.request));
	}
});
