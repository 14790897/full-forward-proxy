// 网站的作用是通过我的网站域名加上需要代理的网址的完整链接，使得这个网址的流量全部经过我的网站给后端请求进行代理然后再返回给前端
// import { replaceWindowLocation, replaceLinks } from './utils.js';

export function initProxy() {
	try {
		console.log('Proxy initialized...');
		let baseURL, prefix;

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
			baseURL = prefix + decodeURIComponent(cookieObj.current_site); // 处理相对路径的情况, 相对路径本身开头就有 / 所以不需要加
			console.log('baseURL from cookieObj:', baseURL);
		} else {
			throw new Error('No current_site in cookie');
		}

		// 创建 MutationObserver 实例
		const observer = new MutationObserver((mutationsList) => {
			mutationsList.forEach((mutation) => {
				if (mutation.type === 'childList') {
					mutation.addedNodes.forEach((node) => {
						if (node.nodeType === 1) {
							// 1 表示元素节点
							replaceWindowLocation(node);
							replaceLinks(node, baseURL, prefix); // 添加链接替换的调用
						}
					});
				} else if (mutation.type === 'attributes') {
					replaceWindowLocation(mutation.target);
					replaceLinks(mutation.target, baseURL, prefix); // 添加链接替换的调用
				}
			});
		});

		// 监控整个 document 的所有子节点
		observer.observe(document, {
			childList: true,
			subtree: true,
			attributes: true,
		});

		// 初次加载时，替换页面上现有的 script 内容
		document.querySelectorAll('script').forEach((script) => {
			replaceWindowLocation(script);
			replaceLinks(script, baseURL, prefix);
		});

		// 创建 Proxy 对象，代理 location 对象
		const locationProxy = new Proxy(window.location, {
			get(target, prop) {
				if (prop === 'href') {
					let modifiedHref = target.href;
					// 如果 href 包含 prefix，移除 prefix
					if (modifiedHref.startsWith(prefix)) {
						modifiedHref = modifiedHref.slice(prefix.length);
					}
					console.log('访问 href:', modifiedHref, '原始href:', target.href);
					return modifiedHref;
				}
				return Reflect.get(target, prop);
			},
			set(target, prop, value) {
				if (prop === 'href') {
					let newValue = value;
					if (!value.startsWith(prefix)) {
						newValue = prefix + value;
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
				let newValue = value;
				if (!value.startsWith(prefix)) {
					newValue = prefix + value;
				}
				// 使用 locationProxy 代理来设置 href
				locationProxy.href = newValue;
			},
		});
	} catch (error) {
		console.error('Error initializing proxy:', error);
	}
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
					//如果没有最后一个条件，会触发'src was "blob:https://dev.paperai.life/b7570176-bcd1-48bd-acf5-7e7d0ee632ee", now set to "https://dev.paperai.life/https://www.youtube.comblob:https://dev.paperai.life/b7570176-bcd1-48bd-acf5-7e7d0ee632ee"'导致service worker无法代理，进一步导致无法播放视频
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
