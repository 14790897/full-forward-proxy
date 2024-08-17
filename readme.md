# full-forward-proxy

本项目是 cloudflare 前向代理。在 cloudflare 网站中新建 worker，把 worker.js 文件中的内容复制进去即可使用。

使用方法为在任意 url 前面加上 https://你的域名/proxy/ 即可使用 cloudflare 加速。

例如 https://forward.paperai.life/proxy/https://github.com/14790897

## 详细步骤

<!-- 1. 创建 KV
   ```sh
   wrangler kv:namespace create full_forward
   wrangler kv:key put --binding=full_forward  "/" ./full-forward-html/index.html
   wrangler kv:key put --binding=full_forward  "/service-worker.js" ./full-forward-html/service-worker.js
   ``` -->
1. 部署
   ```sh
	npm install -g wrangler
   wrangler deploy
   ```

## 功能

- 代理功能：拦截并通过 Cloudflare Worker 转发到目标网站的请求。
- 自动 URL 重写：修改 HTML 内容中的相对 URL，使它们通过代理加载。
- Cookie 记录：在 Cookie 中存储当前访问的目标网站，以便处理后续特殊地直接对根路径请求时不需要再次提供完整的 URL。
- service worker: 拦截非代理网站的请求，使得它们也走代理

## 使用方法

在任意 url 前面加上 https://你的域名/proxy/ 即可使用 cloudflare 加速。


## acknowledgement: https://github.com/gaboolic/cloudflare-reverse-proxy/tree/main
