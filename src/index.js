addEventListener('fetch', (event) => {
	event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
	const url = new URL(request.url);
	if (url.pathname === '/' || url.pathname === '/proxy/') {
		return new Response('hello, world', {
			headers: { 'Content-Type': 'text/plain' },
		});
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
			return new Response(`no cookie, Please visit a website first,cookie:${JSON.stringify(cookieObj)}`, {
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
	// 在 </body> 之前注入 JavaScript 代码
	const scriptToInject = `
  <script>
	service-worker = 'self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const prefix = 'https://your-proxy-url.com/proxy/';
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
});'
    if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker')
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        } else {
            console.error('Service Workers are not supported by this browser.');
        }

  </script>`;
	text = text.replace('</body>', `${scriptToInject}</body>`);
	return new Response(text, {
		headers: response.headers,
	});
}
