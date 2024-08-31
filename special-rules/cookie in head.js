<script>

// 设置 Cookie 为当前用户所在网站的域名
const fullPath = location.pathname.replace('/', ''); // 获取路径部分并移除开头的 '/'
const actualUrl = new URL(fullPath); // 使用路径创建一个新的 URL 对象
const origin = actualUrl.origin; // 提取 origin 部分
if (origin) {
	document.cookie = 'current_site=' + encodeURIComponent(origin) + '; Path=/; Secure'
}
</script>
