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
