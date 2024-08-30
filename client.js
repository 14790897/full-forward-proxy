(function () {
	const originalFetch = window.fetch;
	const prefix = '${baseUrl}';

	window.fetch = async function (input, init) {
		if (typeof input === 'string' && !input.startsWith(prefix)) {
			input = prefix + input;
		} else if (input instanceof Request) {
			const url = input.url;
			if (!url.startsWith(prefix) && !url.startsWith('http')) {
				input = new Request(prefix + url, input);
			}
		}
		return originalFetch(input, init);
	};
})();
(function () {
	const originalOpen = XMLHttpRequest.prototype.open;
	const prefix = '${baseUrl}';

	XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
		// 只对非绝对路径的 URL 添加前缀
		if (!url.startsWith(prefix) && !url.startsWith('http')) {
			url = prefix + url;
		}
		// 调用原始的 open 方法，使用修改后的 URL
		return originalOpen.call(this, method, url, async, user, password);
	};
})();
