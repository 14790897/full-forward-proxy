const str = '/';
const proxyCookie = '__PROXY_VISITEDSITE__';
const replaceUrlObj = '__location____';
var thisProxyServerUrlHttps;
var thisProxyServerUrl_hostOnly;
//information
var myWebsiteURLObject = new URL(window.location.href);
var myWebsiteHost = myWebsiteURLObject.host;
var myWebsiteProtocol = myWebsiteURLObject.protocol;
var prefix = myWebsiteURLObject.origin + '/';
var oriUrlStr = window.location.href.substring(prefix.length);
var oriUrl = new URL(oriUrlStr);

var path = myWebsiteURLObject.pathname.substring(1);
console.log('***************************----' + path);
if (!path.startsWith('http')) path = 'https://' + path;

var original_host = path.substring(path.indexOf('://') + '://'.length); //用于找到要代理的网站的完整链接，不带https
original_host = original_host.split('/')[0]; //这里其实是在找去掉了pathname但是它其实可以先转换成URL再取，方便
var mainOnly = path.substring(0, path.indexOf('://')) + '://' + original_host + '/'; //有https没有path的，最后有/

//*************************************************************************************************************
function changeURL(relativePath) {
	try {
		if (relativePath && relativePath.startsWith(prefix)) relativePath = relativePath.substring(prefix.length);
		if (relativePath && relativePath.startsWith(myWebsiteHost + '/')) relativePath = relativePath.substring(myWebsiteHost.length + 1);
		if (relativePath && relativePath.startsWith(myWebsiteHost)) relativePath = relativePath.substring(myWebsiteHost.length);
	} catch {
		//ignore
	}
	try {
		var absolutePath = new URL(relativePath, path).href;
		absolutePath = absolutePath.replace(window.location.href, path);
		absolutePath = absolutePath.replace(encodeURI(window.location.href), path);
		absolutePath = absolutePath.replace(encodeURIComponent(window.location.href), path);

		absolutePath = absolutePath.replace(prefix, mainOnly);
		absolutePath = absolutePath.replace(prefix, encodeURI(mainOnly));
		absolutePath = absolutePath.replace(prefix, encodeURIComponent(mainOnly));

		absolutePath = absolutePath.replace(prefix, mainOnly.substring(0, mainOnly.length - 1));
		absolutePath = absolutePath.replace(prefix, encodeURI(mainOnly.substring(0, mainOnly.length - 1)));
		absolutePath = absolutePath.replace(prefix, encodeURIComponent(mainOnly.substring(0, mainOnly.length - 1)));

		absolutePath = absolutePath.replace(myWebsiteHost, original_host);

		absolutePath = prefix + absolutePath;
		return absolutePath;
	} catch (e) {
		console.log(path + '   ' + relativePath);
		return '';
	}
}
//*************************************************************************************************************

function networkInject() {
	//inject network request
	var originalOpen = XMLHttpRequest.prototype.open;
	var originalFetch = window.fetch;
	XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
		url = changeURL(url);

		console.log('R:' + url);
		return originalOpen.apply(this, arguments);
	};

	window.fetch = function (input, init) {
		var url;
		if (typeof input === 'string') {
			url = input;
		} else if (input instanceof Request) {
			url = input.url;
		} else {
			url = input;
		}

		url = changeURL(url);

		console.log('R:' + url);
		if (typeof input === 'string') {
			return originalFetch(url, init);
		} else {
			const newRequest = new Request(url, input);
			return originalFetch(newRequest, init);
		}
	};

	console.log('NETWORK REQUEST METHOD INJECTED');
}

function windowOpenInject() {
	const originalOpen = window.open;

	// Override window.open function
	window.open = function (url, name, specs) {
		let modifiedUrl = changeURL(url);
		return originalOpen.call(window, modifiedUrl, name, specs);
	};

	console.log('WINDOW OPEN INJECTED');
}

//***********************************************************************************************
class ProxyLocation {
	constructor(originalLocation) {
		this.originalLocation = originalLocation;
	}

	// 方法：重新加载页面
	reload(forcedReload) {
		this.originalLocation.reload(forcedReload);
	}

	// 方法：替换当前页面
	replace(url) {
		this.originalLocation.replace(changeURL(url));
	}

	// 方法：分配一个新的 URL
	assign(url) {
		this.originalLocation.assign(changeURL(url));
	}

	// 属性：获取和设置 href
	get href() {
		return oriUrlStr;
	}

	set href(url) {
		this.originalLocation.href = changeURL(url);
	}

	// 属性：获取和设置 protocol
	get protocol() {
		return this.originalLocation.protocol;
	}

	set protocol(value) {
		this.originalLocation.protocol = changeURL(value);
	}

	// 属性：获取和设置 host
	get host() {
		console.log('********************host');
		return original_host;
	}

	set host(value) {
		console.log('********************s host');
		this.originalLocation.host = changeURL(value);
	}

	// 属性：获取和设置 hostname
	get hostname() {
		console.log('********************hostname');
		return oriUrl.hostname;
	}

	set hostname(value) {
		console.log('s hostname');
		this.originalLocation.hostname = changeURL(value);
	}

	// 属性：获取和设置 port
	get port() {
		return oriUrl.port;
	}

	set port(value) {
		this.originalLocation.port = value;
	}

	// 属性：获取和设置 pathname
	get pathname() {
		console.log('********************pathname');
		return oriUrl.pathname;
	}

	set pathname(value) {
		console.log('********************s pathname');
		this.originalLocation.pathname = value;
	}

	// 属性：获取和设置 search
	get search() {
		console.log('********************search');
		console.log(oriUrl.search);
		return oriUrl.search;
	}

	set search(value) {
		console.log('********************s search');
		this.originalLocation.search = value;
	}

	// 属性：获取和设置 hash
	get hash() {
		return oriUrl.hash;
	}

	set hash(value) {
		this.originalLocation.hash = value;
	}

	// 属性：获取 origin
	get origin() {
		return oriUrl.origin;
	}
}
//********************************************************************************************

function documentLocationInject() {
	Object.defineProperty(document, 'URL', {
		get: function () {
			return oriUrlStr;
		},
		set: function (url) {
			document.URL = changeURL(url);
		},
	});

	Object.defineProperty(document, '${replaceUrlObj}', {
		get: function () {
			return new ProxyLocation(window.location);
		},
		set: function (url) {
			window.location.href = changeURL(url);
		},
	});
	console.log('LOCATION INJECTED');
}

function windowLocationInject() {
	Object.defineProperty(window, '${replaceUrlObj}', {
		get: function () {
			return new ProxyLocation(window.location);
		},
		set: function (url) {
			window.location.href = changeURL(url);
		},
	});

	console.log('WINDOW LOCATION INJECTED');
}

function historyInject() {
	const originalPushState = History.prototype.pushState;
	const originalReplaceState = History.prototype.replaceState;

	History.prototype.pushState = function (state, title, url) {
		var u = new URL(url, myWebsiteURLObject.href).href;
		return originalPushState.apply(this, [state, title, u]);
	};
	History.prototype.replaceState = function (state, title, url) {
		console.log('****************************************************************************');
		console.log(prefix);
		console.log(url);
		console.log(myWebsiteURLObject.href);
		var u = new URL(url, myWebsiteURLObject.href).href;
		console.log(u);
		return originalReplaceState.apply(this, [state, title, u]);
	};
	console.log('HISTORY INJECTED');
}

//*************************************************************************************************************

function obsPage() {
	var yProxyObserver = new MutationObserver(function (mutations) {
		mutations.forEach(function (mutation) {
			traverseAndConvert(mutation);
		});
	});
	var config = { attributes: true, childList: true, subtree: true };
	yProxyObserver.observe(document.body, config);

	console.log('OBSERVING THE WEBPAGE...');
}

function traverseAndConvert(node) {
	if (node instanceof HTMLElement) {
		removeIntegrityAttributesFromElement(node);
		covToAbs(node);
		node.querySelectorAll('*').forEach(function (child) {
			removeIntegrityAttributesFromElement(child);
			covToAbs(child);
		});
	}
}

function covToAbs(element) {
	var relativePath = '';
	var setAttr = '';
	if (element instanceof HTMLElement && element.hasAttribute('href')) {
		relativePath = element.getAttribute('href');
		setAttr = 'href';
	}
	if (element instanceof HTMLElement && element.hasAttribute('src')) {
		relativePath = element.getAttribute('src');
		setAttr = 'src';
	}

	// Check and update the attribute if necessary
	if (setAttr !== '' && relativePath.indexOf(prefix) != 0) {
		if (!relativePath.includes('*')) {
			if (
				!relativePath.startsWith('data:') &&
				!relativePath.startsWith('javascript:') &&
				!relativePath.startsWith('chrome') &&
				!relativePath.startsWith('edge')
			) {
				try {
					var absolutePath = changeURL(relativePath);
					console.log(absolutePath);
					element.setAttribute(setAttr, absolutePath);
				} catch (e) {
					console.log(path + '   ' + relativePath);
				}
			}
		}
	}
}
function removeIntegrityAttributesFromElement(element) {
	if (element.hasAttribute('integrity')) {
		element.removeAttribute('integrity');
	}
}
//*************************************************************************************************************
function loopAndConvertToAbs() {
	for (var ele of document.querySelectorAll('*')) {
		removeIntegrityAttributesFromElement(ele);
		covToAbs(ele);
	}
	console.log('LOOPED EVERY ELEMENT');
}

function covScript() {
	//由于observer经过测试不会hook添加的script标签，也可能是我测试有问题？
	var scripts = document.getElementsByTagName('script');
	for (var i = 0; i < scripts.length; i++) {
		covToAbs(scripts[i]);
	}
	setTimeout(covScript, 3000);
}
//*************************************************************************************************************

networkInject();
windowOpenInject();
documentLocationInject();
windowLocationInject();
// historyInject();
// 这里实在无能为力不想改，可以pr一个

window.addEventListener('load', () => {
	loopAndConvertToAbs();
	console.log('CONVERTING SCRIPT PATH');
	obsPage();
	covScript();
});
console.log('WINDOW ONLOAD EVENT ADDED');

window.addEventListener(
	'error',
	(event) => {
		var element = event.target || event.srcElement;
		if (element.tagName === 'SCRIPT') {
			console.log('Found problematic script:', element);

			// 调用 covToAbs 函数
			removeIntegrityAttributesFromElement(element);
			covToAbs(element);

			// 创建新的 script 元素
			var newScript = document.createElement('script');
			newScript.src = element.src;
			newScript.async = element.async; // 保留原有的 async 属性
			newScript.defer = element.defer; // 保留原有的 defer 属性

			// 添加新的 script 元素到 document
			document.head.appendChild(newScript);

			console.log('New script added:', newScript);
		}
	},
	true
);
console.log('WINDOW CORS ERROR EVENT ADDED');
