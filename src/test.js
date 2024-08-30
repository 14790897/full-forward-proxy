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
