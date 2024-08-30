import { replaceWindowLocation } from './utils.js';
// 创建一个 MutationObserver 实例
const observer = new MutationObserver((mutationsList) => {
	mutationsList.forEach((mutation) => {
		if (mutation.type === 'childList') {
			mutation.addedNodes.forEach((node) => {
				if (node.nodeType === 1) {
					// 1表示元素节点
					replaceWindowLocation(node);
				}
			});
		} else if (mutation.type === 'attributes') {
			replaceWindowLocation(mutation.target);
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
});


// 创建一个 Proxy 对象，代理 location 对象
const locationProxy = new Proxy(window.location, {
    get(target, prop) {
        if (prop === 'href') {
            // 当访问 window.location.href 时，加入自定义逻辑
            console.log('访问 href:', target.href);
        }
        return Reflect.get(target, prop);
    },
    set(target, prop, value) {
        if (prop === 'href') {
            // 当设置 window.location.href 时，加入自定义逻辑
            console.log('设置 href 为:', value);
            // 这里你可以在设置 href 时加入自己的逻辑
        }
        return Reflect.set(target, prop, value);
    }
});

// 将 proxyLocation 定义为代理对象
Object.defineProperty(window, 'proxyLocation', {
    get: () => locationProxy,
    set: value => {
        // 在这里可以控制直接设置 window.proxyLocation 时的行为
        window.location.assign(value);
    }
});

// 使用示例
console.log(window.proxyLocation.href);  // 访问 href 时，会触发 get 钩子
window.proxyLocation.href = 'https://example.com';  // 设置 href 时，会触发 set 钩子
