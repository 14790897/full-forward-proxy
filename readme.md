# full-forward-proxy

本项目尽全力将网页上的内容全部通过 CF Worker 进行代理, 目前发现对谷歌，油管不适配

## 使用方法

1. 在任意 url 前面加上 https://你的域名/ 例如 https://future.paperai.life/https://github.com/14790897

## 自己搭建步骤

<!-- 1. 创建 KV
   ```sh
   wrangler kv:namespace create full_forward
   wrangler kv:key put --binding=full_forward  "/" ./full-forward-html/index.html
   wrangler kv:key put --binding=full_forward  "/service-worker.js" ./full-forward-html/service-worker.js
   ``` -->

1. 克隆仓库并切换到仓库目录
2. 部署到 cf （使用 wrangler）

   ```sh
   npm install -g wrangler
   wrangler login
   npm install
   wrangler deploy
   ```

3. 在 cf 上配置自定义域名（可选）

## 功能

- 代理功能：拦截并通过 Cloudflare Worker 转发到目标网站的请求。
- 自动 URL 重写：修改 HTML 内容中的相对 URL，使它们通过代理加载。
- Cookie 记录：在 Cookie 中存储当前访问的目标网站，以便处理后续特殊地直接对根路径请求时不需要再次提供完整的 URL。
- service worker: 拦截非代理网站的请求，使得它们也走代理

## 体验网址

https://future.paperai.life

## 演示视频

https://file.paperai.life/%E6%97%A0%E4%BB%A3%E7%90%86%E5%9B%BD%E5%86%85%E8%AE%BF%E9%97%AEpornhub%E6%96%B9%E6%B3%95.mp4

## 参考项目: https://github.com/gaboolic/cloudflare-reverse-proxy
