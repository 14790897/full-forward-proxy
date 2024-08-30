// 网站的作用是通过我的网站域名加上需要代理的网址的完整链接，使得这个网址的流量全部经过我的网站给后端请求进行代理然后再返回给前端
//但是我认为service worker的强大能力足以把所有链接都替换成所需的格式，应该是不需要我在客户端进行替换，所以它那个页面的脚本阻止了默认的链接打开方式，然后windows.location的相对路径也不需要处理，这个sw可以代理，推测油管使用了history，但并不是
// import { replaceWindowLocation, replaceLinks } from './utils.js';
// test: console.log(window.proxyLocation.href);
//window.proxyLocation.href = "/watch?v=YaZ5eV9BEX8";

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
		let lastUrl = window.location.href;

		// 获取 cookies
		const cookie = document.cookie;
		const cookieObj = Object.fromEntries(
			cookie.split(';').map((cookie) => {
				const [key, ...val] = cookie.trim().split('=');
				return [key.trim(), val.join('=').trim()];
			})
		);

		if (cookieObj.current_site) {
			prefix = location.origin + '/'; // 处理绝对路径情况, 前面需要有 /
			currentSite = decodeURIComponent(cookieObj.current_site);
			baseURL = prefix + currentSite; // 处理相对路径的情况, 相对路径本身开头就有 / 所以不需要加
			console.log('baseURL from cookieObj:', baseURL);
		} else {
			throw new Error('No current_site in cookie');
		}
		interceptHistory(baseURL, prefix); // 添加 history 拦截

		document.addEventListener('click', (event) => {// 但是现在大多数也没用这个都检测不到
			// 确保链接点击后的 URL 变化已经完成
			setTimeout(() => {
				let myWebsiteURL = new URL(window.location.href);
				if (window.location.href !== lastUrl) {
					lastUrl = window.location.href;
					if (!myWebsiteURL.pathname.startsWith('http')) {
						console.log('这个时候路径是不对的，需要刷新页面');
						location.reload(); // 刷新页面
					} else {
						console.log('路径正确:', window.location.href);
					}
				}
			}, 100); // 100ms 延迟，确保 URL 变化已经生效
		});
		setInterval(() => {
			if (window.location.href !== lastUrl) {
				lastUrl = window.location.href;
				let myWebsiteURL = new URL(window.location.href);
				if (!myWebsiteURL.pathname.startsWith('http')) {
					console.log('这个时候路径是不对的，需要刷新页面');
					location.reload(); // 刷新页面
				} else {
					console.log('路径正确:', window.location.href);
				}
				console.log('URL changed to', lastUrl);
			} else {
				console.log('URL not changed:', window.location.href);
			}
		}, 300); // 每300毫秒检查一次
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
					if (!value.startsWith(prefix) && value.startsWith('http')) {
						newValue = prefix + value;
					} else if (!value.startsWith('http')) {
						//相对路径这里一般是以/开头
						newValue = baseURL + value;
					}
					console.log('设置 href 为:', newValue, '原始href:', value);
					return Reflect.set(target, prop, newValue);
				}
				return Reflect.set(target, prop, value);
			},
		});

		Object.defineProperty(window, 'proxyLocation', {
			get: () => locationProxy,
			set: (value) => {
				// 使用 locationProxy 代理来设置 href
				locationProxy.href = value;
			},
		});
	} catch (error) {
		console.error('Error initializing proxy:', error);
	}
}

export function interceptHistory(baseURL, prefix) {
	const originalPushState = history.pushState;
	const originalReplaceState = history.replaceState;

	history.pushState = function (state, title, url) {
		if (!url.startsWith(prefix) && url.startsWith('http')) {
			url = prefix + url;
		} else if (!url.startsWith('http')) {
			url = baseURL + url;
		}
		console.log('pushState called:', { state, title, url });
		// 正确传递参数
		return originalPushState.apply(history, [state, title, url]);
	};

	history.replaceState = function (state, title, url) {
		if (!url.startsWith(prefix) && url.startsWith('http')) {
			url = prefix + url;
		} else if (!url.startsWith('http')) {
			url = baseURL + url;
		}
		console.log('replaceState called:', { state, title, url });
		// 正确传递参数
		return originalReplaceState.apply(history, [state, title, url]);
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

export function replaceLinks(node, baseUrl, prefix) {
	if (node.nodeType === Node.ELEMENT_NODE) {
		const attributesToReplace = ['href', 'src', 'action'];
		attributesToReplace.forEach((attr) => {
			if (node.hasAttribute(attr)) {
				let attrValue = node.getAttribute(attr);
				let originalValue = attrValue; // 记录原始值

				// 如果已经以 prefix 开头，则不操作
				if (attrValue.startsWith(prefix)) {
					console.log(`${attr}="${originalValue}" already starts with prefix, no changes.`);
				} else if (!attrValue.startsWith('http') && !attrValue.startsWith('#') && !attrValue.includes(':')) {
					//如果没有最后一个条件，会触发'src was "blob:https://dev.paperai.life/b7570176-bcd1-48bd-acf5-7e7d0ee632ee", now set to "https://dev.paperai.life/https://www.youtube.comblob:https://dev.paperai.life/b7570176-bcd1-48bd-acf5-7e7d0ee632ee"'导致service worker无法代理，进一步导致无法播放视频,但是原始代码的网页中没找代理blob的信息
					// 处理相对路径的情况
					let newValue = `${baseUrl}${attrValue}`;
					node.setAttribute(attr, newValue);
					console.log(`${attr} was "${originalValue}", now set to "${newValue}"`);
				} else if (attrValue.startsWith('http')) {
					// 处理绝对路径的情况
					let newValue = `${prefix}${attrValue}`;
					node.setAttribute(attr, newValue);
					console.log(`${attr} was "${originalValue}", now set to "${newValue}"`);
				}
			}
		});
	}
}
