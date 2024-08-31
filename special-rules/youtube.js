let lastUrl = window.location.href;

// 通过监测地址栏的变化，且cookie网站是YouTube则刷新
const cookie = document.cookie;

const cookieObj = Object.fromEntries(
	cookie.split(';').map((cookie) => {
		const [key, ...val] = cookie.trim().split('=');
		return [key.trim(), val.join('=').trim()];
	})
);

if (cookieObj.current_site) {
	currentSite = decodeURIComponent(cookieObj.current_site);
	if (currentSite.includes('youtube')) {
		// 对url监测
		let lastUrl = window.location.href;
		setInterval(() => {
			if (window.location.href.slice(-5) !== lastUrl.slice(-5)) {
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
	}
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
