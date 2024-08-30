// 网站的作用是通过我的网站域名加上需要代理的网址的完整链接，使得这个网址的流量全部经过我的网站给后端请求进行代理然后再返回给前端
import { replaceWindowLocation, replaceLinks } from '../src/utils.js';
let baseURL, prefix;
const cookie = document.cookie;

const cookieObj = Object.fromEntries(
	cookie.split(';').map((cookie) => {
		const [key, ...val] = cookie.trim().split('=');
		return [key.trim(), val.join('=').trim()];
	})
);
if (cookieObj.current_site) {
	prefix = location.origin + '/'; //这里处理绝对路径情况,前面需要有/
	baseURL = prefix + decodeURIComponent(cookieObj.current_site); // 这里是处理相对路径的情况,相对路径本身开头就有/所以不需要加
	console.log('baseURL from cookieObj:', baseURL);
} else {
	throw new Error('No current_site in cookie');
}
// 创建一个 MutationObserver 实例
const observer = new MutationObserver((mutationsList) => {
	mutationsList.forEach((mutation) => {
		if (mutation.type === 'childList') {
			mutation.addedNodes.forEach((node) => {
				if (node.nodeType === 1) {
					// 1表示元素节点
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
