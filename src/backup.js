addEventListener('fetch', (event) => {
	event.respondWith(handleRequest(event.request));
});
serviceWorker = `
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
`;
async function handleRequest(request) {
	const url = new URL(request.url);
	if (url.pathname === '/service-worker.js') {
		// 直接返回 Service Worker 脚本内容
		return new Response(serviceWorker, {
			headers: { 'Content-Type': 'application/javascript' },
		});
	}
	if (url.pathname === '/' || url.pathname === '/proxy/') {
		// 将请求代理到 Cloudflare Pages 部署的网站
		const pagesUrl = 'https://html.paperai.life'; // 将其替换为你的 Pages URL https://pages.paperai.life
		return fetch(pagesUrl);
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
	const baseUrl = `${url.origin}/proxy/${actualOrigin}`;

	if (response.headers.get('Content-Type')?.includes('text/html')) {
		response = await updateRelativeUrls(
			response,
			baseUrl // 重新请求
		);
	}

	const modifiedResponse = new Response(response.body, response);
	modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
	// 使用一个cookie来记录当前访问的网站
	const currentSiteCookie = `current_site=${encodeURIComponent(actualUrl.origin)}; Path=/; HttpOnly; Secure`;
	modifiedResponse.headers.append('Set-Cookie', currentSiteCookie);
	return modifiedResponse;
}

async function updateRelativeUrls(response, baseUrl) {
	let text = await response.text();
	// 替换HTML中的相对路径, 不能替换action，会报错请enable cookie
	text = text.replace(/(href|src|action)="([^"]*?)"/g, (match, p1, p2) => {
		if (!p2.includes('://') && !p2.startsWith('#')) {
			return `${p1}="${baseUrl}${p2}"`;
		}
		return match;
	});
	// 在 </body> 之前注入 JavaScript 代码(这个似乎没有用，无法改写，目前使用cookie可以代替这个代码的功能)
	const scriptToInject = `
  <script>
    (function() {
  const originalFetch = window.fetch;
  const prefix = '${baseUrl}';

  window.fetch = async function(input, init) {
    if (typeof input === "string" && !input.startsWith(prefix) ) {
      input = prefix + input;
    } else if (input instanceof Request) {
      const url = input.url;
      if (!url.startsWith(prefix) && !url.startsWith("http")) {
        input = new Request(prefix + url, input);
      }
    }
    return originalFetch(input, init);
  };
})();
(function() {
  const originalOpen = XMLHttpRequest.prototype.open;
  const prefix = '${baseUrl}';

  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    // 只对非绝对路径的 URL 添加前缀
    if (!url.startsWith(prefix) && !url.startsWith('http')) {
      url = prefix + url;
    }
    // 调用原始的 open 方法，使用修改后的 URL
    return originalOpen.call(this, method, url, async, user, password);
  };
})();

  </script>`;
	text = text.replace('</body>', `${scriptToInject}</body>`);
	return new Response(text, {
		headers: response.headers,
	});
}
