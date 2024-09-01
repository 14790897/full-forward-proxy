// 网站的作用是通过我的网站域名加上需要代理的网址的完整链接，使得这个网址的流量全部经过我的网站给后端请求进行代理然后再返回给前端
//但是我认为service worker的强大能力足以把所有链接都替换成所需的格式，应该是不需要我在客户端进行替换，所以它那个页面的脚本阻止了默认的链接打开方式，然后windows.location的相对路径也不需要处理，这个sw可以代理，推测油管使用了history，但并不是
// import { replaceWindowLocation, replaceLinks } from './utils.js';
// test: console.log(window.proxyLocation.href);
//window.proxyLocation.href = "/watch?v=YaZ5eV9BEX8";
// history测试：history.pushState({ someData: 123 }, 'Test Title', '/new-page'); history.replaceState({ someData: 456 }, 'Another Title', 'http://example.com/page');
// todo document.url
export function initProxy() {
	try {
		console.log('Proxy initialized...');
		document.addEventListener('click', (event) => {
			const target = event.target.closest('a');
			if (target && !target.href.startsWith(prefix)) {
				event.preventDefault(); // 阻止默认跳转行为
				window.proxyLocation.href = target.href; // 使用代理跳转
			}
		});
		let baseURL, prefix, currentSite;

		// 获取 cookies
		const cookie = document.cookie;
		const cookieObj = Object.fromEntries(
			cookie.split(';').map((cookie) => {
				const [key, ...val] = cookie.trim().split('=');
				return [key.trim(), val.join('=').trim()];
			})
		);
		if (cookieObj.current_site) {
			currentSite = decodeURIComponent(cookieObj.current_site);
			prefix = location.origin + '/'; // 处理绝对路径情况, 前面需要有 /
			baseURL = prefix + currentSite; // 处理相对路径的情况, 相对路径本身开头就有 / 所以不需要加
			console.log('currentSite in client.js:', currentSite);
			
		} else {
			// throw new Error('No current_site in cookie');
			console.error('No current_site in cookie');
		}
		// interceptHistory(baseURL, prefix); // 添加 history 拦截  github处理有问题

		const observer = new MutationObserver((mutationsList) => {
			mutationsList.forEach((mutation) => {
				if (mutation.type === 'childList') {
					mutation.addedNodes.forEach((node) => {
						if (node.nodeType === 1) {
							// 1 表示元素节点
							replaceWindowLocation(node);
							// replaceLinks(node, baseURL, prefix); // 添加链接替换的调用
						}
					});
				} else if (mutation.type === 'attributes') {
					replaceWindowLocation(mutation.target);
					// replaceLinks(mutation.target, baseURL, prefix); // 添加链接替换的调用
				}
			});
		});

		observer.observe(document, {
			childList: true,
			subtree: true,
			attributes: true,
		});

		// 初次加载时，替换页面上现有的 script 内容
		document.querySelectorAll('script').forEach((script) => {
			replaceWindowLocation(script);
			// replaceLinks(script, baseURL, prefix);
		});

		const locationProxy = new Proxy(window.location, {
			get(target, prop) {
				if (prop === 'href') {
					let modifiedHref = target.href;
					// 如果 href 包含 prefix，移除 prefix(应该是必定包含prefix)
					if (modifiedHref.startsWith(prefix)) {
						modifiedHref = modifiedHref.slice(prefix.length);
					}
					if (!modifiedHref.startsWith('http')) {
						modifiedHref = currentSite + '/' + modifiedHref;
					}
					console.log('访问 href:', modifiedHref, '原始href:', target.href);
					return modifiedHref;
				}
				return Reflect.get(target, prop);
			},
			set(target, prop, value) {
				if (prop === 'href') {
					let newValue = value;
					if (!value.startsWith(prefix) && value.startsWith('http')) {//这个设置的是完整域名
						newValue = prefix + value;
					} else if (!value.startsWith('http')) { //这个设置的是相对路径，有/
						//相对路径这里一般是以/开头
						newValue = baseURL + value;
					}
					console.log('设置 href 为:', newValue, '原始href:', value);
					return Reflect.set(target, prop, newValue);
				}
				return Reflect.set(target, prop, value);
			},
		});
		if (!Object.prototype.hasOwnProperty.call(window, 'proxyLocation')) {
			Object.defineProperty(window, 'proxyLocation', {
				configurable: true, // 允许再次定义
				get: () => locationProxy,
				set: (value) => {
					// 使用 locationProxy 代理来设置 href
					locationProxy.href = value;
				},
			});
		}
	} catch (error) {
		console.error('Error initializing proxy:', error);
	}
}

export function interceptHistory(baseURL, prefix) {
	const originalPushState = history.pushState;
	const originalReplaceState = history.replaceState;

	history.pushState = function (state, title, url) {
		let urlStr = typeof url === 'string' ? url : url.toString();
		if (!urlStr.startsWith(prefix) && urlStr.startsWith('http')) {
			urlStr = prefix + urlStr;
		} else if (!urlStr.startsWith('http')) {
			urlStr = baseURL + urlStr;
		}
		console.log('pushState called:', { state, title, urlStr });
		// 正确传递参数
		return originalPushState.apply(history, [state, title, urlStr]);
	};

	history.replaceState = function (state, title, url) {
		let urlStr = typeof url === 'string' ? url : url.toString();
		if (!urlStr.startsWith(prefix) && urlStr.startsWith('http')) {
			urlStr = prefix + urlStr;
		} else if (!urlStr.startsWith('http')) {
			urlStr = baseURL + urlStr;
		}
		console.log('replaceState called:', { state, title, urlStr });
		// 正确传递参数
		return originalReplaceState.apply(history, [state, title, urlStr]);
	};

	// 监听 popstate 事件
	window.addEventListener('popstate', function (event) {
		console.log('popstate event triggered:', event.state);
	});
}

export function replaceWindowLocation(node) {
	if (node.innerHTML.includes('window.location')) {
		node.innerHTML = node.innerHTML.replace(/window\.location/g, 'window.proxyLocation');
		console.log('Replaced window.location with window.proxyLocation');
	}
}
