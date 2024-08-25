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
	const originUrl = new URL(self.location.href); // 当前所在的网站的域名的url对象
	const domain = originUrl.origin; // 当前所在的网站的域名
	const prefix = `${domain}/proxy/`;

	if (requestUrl.pathname === '/' || requestUrl.pathname === '/service-worker.js') {
		event.respondWith(fetch(event.request)); // 直接传递给worker
	}
	// 如果请求的域名不以domain开头，说明他请求了外部的服务那个服务是一个完整的链接，则加上前缀，使得可以代理（chatgpt说对其它域名的请求，无法代理，只能试试在返回页面的时候修改全部url）
	else if (!requestUrl.href.startsWith(domain) && !requestUrl.href.startsWith('chrome-extension')) {
		// 检查是否为 script 文件
		if (requestUrl.pathname.endsWith('.js') || requestUrl.pathname.endsWith('.mjs') || requestUrl.pathname.endsWith('.css')) {
			console.log('Skipping proxy for script file:', requestUrl.href);
			// 直接传递请求，不进行代理
			event.respondWith(fetch(event.request));
			return;
		}

		// 对 URL 进行编码，避免特殊字符引发的问题
		const encodedUrl = encodeURIComponent(requestUrl.href);
		const modifiedUrl = `${prefix}${encodedUrl}`;
		console.log(
			'URL does not start with prefix. Adding prefix and redirecting...,modifiedUrl:',
			modifiedUrl,
			'originRequestUrl:',
			requestUrl.href
		);

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
		event.respondWith(redirectResponse); //这里不知道为什么不用原来的fetch了？
		// event.respondWith(fetch(modifiedRequest));
		return;
	} else {
		console.log('Passing through unmodified request. 未更改，requestUrl.href：', requestUrl.href);
		event.respondWith(fetch(event.request));
	}
});
