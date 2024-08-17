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
	const prefix = 'https://forward.paperai.life/proxy/';
	const url = new URL(event.request.url);

	// 处理 fetch 请求
	if (!url.href.startsWith(prefix) && url.protocol.startsWith('http')) {
		const modifiedUrl = prefix + encodeURIComponent(url.href);
		const modifiedRequest = new Request(modifiedUrl, {
			method: event.request.method,
			headers: event.request.headers,
			body: event.request.body,
			mode: event.request.mode,
			credentials: event.request.credentials,
			cache: event.request.cache,
			redirect: event.request.redirect,
			referrer: event.request.referrer,
			integrity: event.request.integrity,
		});
		event.respondWith(fetch(modifiedRequest));
		return;
	}

	event.respondWith(fetch(event.request));
});
