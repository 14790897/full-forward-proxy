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
				// 如果已经以prefix开头，则不操作
				if (attrValue.startsWith(prefix)) {
					console.log(`${attr}="${attrValue}" already starts with prefix, no changes made.`);
				} else if (!attrValue.includes('://') && !attrValue.startsWith('#')) {
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

