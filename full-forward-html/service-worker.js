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
	console.log('Fetch event for:', event.request.url);

	const prefix = 'https://forward.paperai.life/proxy/';
	const url = new URL(event.request.url);
	// 如果请求路径不以 '/proxy/' 开头
	if (!url.pathname.startsWith('/proxy/')) {
		// 从请求头中获取 Cookie
		const cookie = event.request.headers.get('Cookie');

		if (cookie) {
			// 解析 Cookie 为对象
			const cookieObj = Object.fromEntries(
				cookie.split(';').map((cookie) => {
					const [key, ...val] = cookie.trim().split('=');
					return [key.trim(), val.join('=').trim()];
				})
			);

			if (cookieObj.current_site) {
				// 如果 current_site 存在，从中构造实际的 URL
				const actualUrlStr = decodeURIComponent(cookieObj.current_site) + url.pathname + url.search + url.hash;
				console.log('actualUrlStr in cookieObj:', actualUrlStr);
				const actualUrl = new URL(actualUrlStr);

				// 构造重定向 URL
				const redirectUrl = `${url.origin}/proxy/${actualUrl.href}`;

				// 响应重定向
				event.respondWith(Response.redirect(redirectUrl, 301));
				return;
			} else {
				// 如果 Cookie 中没有 current_site
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
			return new Response(`no cookie, Please visit a website first,cookie:${JSON.stringify(cookieObj)}`, {
				status: 400,
				headers: { 'Content-Type': 'text/plain' },
			});
		}
	}
	// 处理 fetch 请求
	else if (!url.href.startsWith(prefix)) {
		const modifiedUrl = prefix + url.href;
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

		const modifiedRequest = new Request(modifiedUrl, modifiedRequestInit);
		event.respondWith(fetch(modifiedRequest));
		return;
	} else {
		event.respondWith(fetch(event.request));
	}
});
