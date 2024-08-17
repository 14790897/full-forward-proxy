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

	// 处理 fetch 请求
	if (!url.href.startsWith(prefix)) {
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
