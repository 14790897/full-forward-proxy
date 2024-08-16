addEventListener('fetch', (event) => {
	event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
	const url = new URL(request.url);
	console.log('url:', url);
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
			const cookieObj = Object.fromEntries(cookie.split(';').map((cookie) => cookie.split('=')));
			if (cookieObj.current_site) {
				actualUrlStr = cookieObj.current_site + url.pathname + url.search + url.hash;
				console.log('actualUrl:', actualUrl);
			} else {
				return new Response('Please visit a website first', {
					status: 400,
					headers: { 'Content-Type': 'text/plain' },
				});
			}
		}
	} else {
		// 例如https://14790897.xyz/proxy/https://youtube.com 会访问 https://youtube.com
		actualUrlStr = url.pathname.replace('/proxy/', '') + url.search + url.hash; //使用的只有pathname
	}

	const actualUrl = new URL(actualUrlStr);
	console.log('actualUrl:', actualUrl);
	const actualOrigin = actualUrl.origin;
	const modifiedRequest = new Request(actualUrl, {
		headers: request.headers,
		method: request.method,
		body: request.body,
		redirect: 'follow',
	});

	let response = await fetch(modifiedRequest);

	if (response.headers.get('Content-Type')?.includes('text/html')) {
		response = await updateRelativeUrls(
			response,
			`${url.origin}/proxy/${actualOrigin}` // 重新请求
		);
	}

	const modifiedResponse = new Response(response.body, response);
	modifiedResponse.headers.append('Set-Cookie', currentSiteCookie);
	// 使用一个cookie来记录当前访问的网站
	const currentSiteCookie = `current_site=${encodeURIComponent(actualUrl.origin)}; Path=/; HttpOnly; Secure`;
	modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
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
    console.log('This script has been injected from cf workers.');

    const proxyPrefix = '${baseUrl}';
    function proxyUrl(url) {
      return proxyPrefix + encodeURIComponent(url);
    }

 function updateLinks(element) {
  element.querySelectorAll('a, img, script, link').forEach(tag => {
    let url = tag.href || tag.src;
    if (url && !url.startsWith(proxyPrefix) && !url.startsWith('data:') && !url.startsWith('#')) {
      let proxyUrl = proxyPrefix + encodeURIComponent(url);
      if (tag.href) tag.href = proxyUrl;
      if (tag.src) tag.src = proxyUrl;
      console.log('已经替换：', proxyUrl);
    }
  });
}
		const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element node
          updateLinks(node);
        }
      });
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });
  </script>`;
	text = text.replace('</body>', `${scriptToInject}</body>`);

	return new Response(text, {
		headers: response.headers,
	});
}
