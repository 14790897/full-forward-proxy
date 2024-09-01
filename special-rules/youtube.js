let lastUrl = window.location.href;

// 通过监测地址栏的变化，且cookie网站是YouTube则刷新
// 但我发现当我完善了SW的域名获取规则之后它就已经可以捕获到油管的请求了,所以不需要下面的代码
const cookie = document.cookie;

const cookieObj = Object.fromEntries(
	cookie.split(';').map((cookie) => {
		const [key, ...val] = cookie.trim().split('=');
		return [key.trim(), val.join('=').trim()];
	})
);
currentSite = decodeURIComponent(cookieObj.current_site);
// youtube检测路径的修改
if (currentSite.includes('youtube')) {
	// 对url监测
	let lastUrl = window.location.href;
	setInterval(() => {
		if (window.location.href.slice(-5) !== lastUrl.slice(-5)) {
			lastUrl = window.location.href;
			let myWebsiteURL = new URL(window.location.href);
			//这个脚本的运行位置是在我的网站下，因为这里已经是我的网站所以不需要检查域名是不是我的网站的路径，然后由于油管网站他会修改路径却不发起网络请求，所以我没办法在service worker拦截，只能在这里进行刷新页面，使得能发起请求，但根路径的话会和我的首页进行冲，突所以我觉得额外加上一个前缀确实有一些帮助
			if (!myWebsiteURL.pathname.startsWith('/http') || !myWebsiteURL.pathname.startsWith('/')) {
				//因为YouTube首页根目录路径是'/',为了使得能够正常访问，所以这里需要加上'/'
				console.log('这个时候路径是不对的，需要刷新页面');
				console.log('URL changed to', lastUrl);
				location.reload(); // 刷新页面
			} else {
				console.log('路径正确:', window.location.href);
			}
		} else {
			console.log('URL not changed:', window.location.href);
		}
	}, 300); // 每300毫秒检查一次
}
// 监测点击事件，如果点击后路径不对则刷新
document.addEventListener('click', (event) => {
	// 但是现在大多数也没用这个都检测不到
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

// 最简单的定时监测会导致对其他网页的不适配
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
