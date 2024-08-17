import { handleEvent } from './route.js';

addEventListener('fetch', (event) => {
	event.respondWith(handle(event));
});

async function handle(event) {
	try {
		const request = event.request;
		const url = new URL(request.url);

		if (url.pathname === '/' || url.pathname === '/service-worker.js') {
			// Add logic to decide whether to serve an asset or run your original Worker code
			return handleEvent(event);
			// 将请求代理到 Cloudflare Pages 部署的网站
			// const pagesUrl = 'https://html.paperai.life'; // 将其替换为你的 Pages URL https://pages.paperai.life
			// return fetch(pagesUrl);
		}
		let actualUrlStr;

		// 例如https://14790897.xyz/proxy/https://youtube.com 会访问 https://youtube.com
		actualUrlStr = url.pathname.replace('/proxy/', '') + url.search + url.hash; //使用的只有pathname

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
		const currentSiteCookie = `current_site=${encodeURIComponent(actualUrl.origin)}; Path=/; SameSite=None;`;
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
	text = text.replace(/http[s]?:\/\/(?![^<]*<\/(?:link|script)>)[^"'\s]+/g, (match) => {
		console.log(`${prefix}${match}`);
		return `${prefix}${match}`;
	});
	// 替换HTML中的相对路径, 不能替换action，会报错: 请enable cookie
	text = text.replace(/(href|src|action)="([^"]*?)"/g, (match, p1, p2) => {
		if (!p2.includes('://') && !p2.startsWith('#')) {
			console.log(`${p1}="${baseUrl}${p2}"`);
			return `${p1}="${baseUrl}${p2}"`;
		}
		return match;
	});
	// 在 </body> 之前注入 JavaScript 替换链接代码
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
