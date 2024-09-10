'use strict';

// frontend/service-worker.js
// 网站的作用是通过我的网站域名加上需要代理的网址的完整链接，使得这个网址的流量全部经过我的网站给后端请求进行代理然后再返回给前端
// sw可以拦截所有来自本域名的请求，sw不能读取cookie：https://stackoverflow.com/questions/59087642/reading-request-headers-inside-a-service-worker
self.addEventListener('install', (event) => {
	console.log('Service Worker installing...');
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	console.log('Service Worker activating...');
	event.waitUntil(self.clients.claim());
});

// 定义不需要处理的路径和协议
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
const excludedProtocols = ['chrome-extension:', 'about:'];

self.addEventListener('fetch', (event) => {
	event.respondWith(
		(async function () {
			try {
				const webRequestUrlObject = new URL(event.request.url); // 用户请求的完整链接
				if (excludedPaths.includes(webRequestUrlObject.pathname) || excludedProtocols.includes(webRequestUrlObject.protocol)) {
					return fetch(event.request); // 直接转发，不修改
				} else {
					const myWebsiteDomain = new URL(self.location.href).origin; // 我的网站的域名的域名（也就是我的代理网站）
					const prefix = `${myWebsiteDomain}/`;

					//正常情况下请求的链接应该是我的域名加上需要代理的完整的网址路径，如果请求的是我的代理网站的域名加上不带http域名的路径，说明需要使用上一次请求获得到的需要代理的域名加上去(条件：以我的网站的域名开头,不带 /http 前缀) 但是如果说Href它是一个相对路径的话,好像有问题
					// 如果它是以别的网站域名为开头的话那么直接加上我的网站域名就行了,见第二个if
					if (!webRequestUrlObject.pathname.startsWith('/http') && webRequestUrlObject.href.startsWith(myWebsiteDomain)) {
						// 从 Cache 中获取 lastRequestedDomain
						const cache = await caches.open('full-proxy-cache');
						const cachedResponse = await cache.match('lastRequestedDomain');
						let lastRequestedDomain = cachedResponse ? await cachedResponse.text() : null;
						// console.log('lastRequestedDomain:', lastRequestedDomain);

						if (lastRequestedDomain) {
							const reconstructedTrueUrl = `${decodeURIComponent(lastRequestedDomain)}${webRequestUrlObject.pathname}${
								webRequestUrlObject.search
							}`;
							const reconstructedUrl = `${prefix}${reconstructedTrueUrl}`;

							const redirectUrl = new URL(reconstructedUrl);
							const redirectResponse = Response.redirect(redirectUrl, 308);
							// console.log(
							// 	'请求的路径不包含完整的 URL,同时它是以我的网站的域名开头,已修改:',
							// 	redirectUrl.href,
							// 	'原始请求URL:',
							// 	webRequestUrlObject.href
							// );
							return redirectResponse;
						} else {
							console.log(`No last requested domain available. webRequestUrlObject: ${webRequestUrlObject.href}`);
							return new Response('No last requested domain available', { status: 400 });
						}
					}
					// 如果请求的域名不以myWebsiteDomain开头，说明他请求了外部的服务同时那个服务是一个完整的链接，则加上前缀，使得可以代理, 同时我认为这个不是主要的网页所以不将它加入域名的缓存中
					if (!webRequestUrlObject.href.startsWith(myWebsiteDomain)) {
						const modifiedUrl = `${prefix}${webRequestUrlObject.href}`;
						// console.log('URL未被添加前缀,已修改:', modifiedUrl, '原始请求URL:', webRequestUrlObject.href);
						// 这里重定向到新的 URL，暂时不使用
						const redirectUrl = new URL(modifiedUrl);
						const redirectResponse = Response.redirect(redirectUrl, 308);
						return redirectResponse;
					}
					// 捕获其他之前未处理的请求
					// console.log('未修改,链接已经符合代理格式：', webRequestUrlObject.href);
					const response = await fetch(event.request);
					// let clonedResponse = response.clone();
					if (response.headers.get('Content-Type')?.includes('text/html')) {
						// const text = await clonedResponse.text(); // 读取克隆的响应体
						// if (text.length > 1500) {
						// 检查内容长度,因为我发现有些text页面它是没有内容的,所以这些请求需要忽略
						// await getUrlOriginPutCache(webRequestUrlObject);
						await cacheActiveClientUrl();
						// }
					}
					return response;
				}
			} catch (error) {
				console.error('通用Fetch失败', error, '请求URL:', event.request.url);
				return new Response('Proxy error occurred', { status: 500 });
			}
		})()
	);
});

// 用于获取当前活跃的客户端，并缓存其URL
async function cacheActiveClientUrl() {
	try {
		const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });

		// 初始化变量以存储当前活跃的客户端
		let activeClient = null;

		// 遍历所有客户端，寻找可见的（visible）客户端
		for (const client of clientList) {
			if (client.visibilityState === 'visible') {
				activeClient = client;
				break; // 找到后就停止循环
			}
		}

		if (activeClient) {
			try {
				const clientUrlObject = new URL(activeClient.url);
				const actualClientUrlStr = clientUrlObject.pathname.replace('/', '');
				const actualClientUrlObject = new URL(actualClientUrlStr);
				const currentSite = encodeURIComponent(actualClientUrlObject.origin);
				await getUrlOriginPutCache(currentSite);
				// 将当前站点发送到客户端
				activeClient.postMessage({ currentSite });
				console.log('User is currently on this page:', currentSite);
			} catch (urlError) {
				throw new Error(`Failed to construct URL from activeClient: ${activeClient.url}, error: ${urlError}`);
			}
		} else {
			console.log('No active client found.');
		}
	} catch (error) {
		// throw new Error(`Error in cacheActiveClientUrl: ${error}`);
		console.log(`Error in cacheActiveClientUrl: ${error}`);
	}
}

const getUrlOriginPutCache = async (currentSite) => {
	try {
		const cache = await caches.open('full-proxy-cache');
		await cache.put('lastRequestedDomain', new Response(currentSite));
		console.log('lastRequestedDomain put in cache:', currentSite);
	} catch (error) {
		throw new Error(`getUrlOriginPutCache failed: ${error}`);
	}
};
