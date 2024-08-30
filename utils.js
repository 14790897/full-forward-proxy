// 替换函数
export function replaceWindowLocation(node) {
	if (node.innerHTML.includes('window.location')) {
		node.innerHTML = node.innerHTML.replace(/window\.location/g, 'window.proxyLocation');
		console.log('Replaced window.location with window.proxyLocation');
	}
}
// 这个函数用于替换 href, src, action 的值
export function replaceLinks(node) {
	if (node.nodeType === Node.ELEMENT_NODE) {
		const attributesToReplace = ['href', 'src', 'action'];
		attributesToReplace.forEach((attr) => {
			if (node.hasAttribute(attr)) {
				let attrValue = node.getAttribute(attr);
				if (!attrValue.includes('://') && !attrValue.startsWith('#')) {
					node.setAttribute(attr, `${baseUrl}${attrValue}`);
					console.log(`${attr}="${baseUrl}${attrValue}"`);
				} else if (attrValue.includes('://')) {
					node.setAttribute(attr, `${prefix}${attrValue}`);
					console.log(`${attr}="${prefix}${attrValue}"`);
				}
			}
		});
	}
}
