# full-forward-proxy

本项目尽全力将网页上的内容全部通过 CF Worker 进行代理, 油管，pornhub 可用

## 使用方法

1. 在任意 url 前面加上 https://部署域名/ 例如 https://tomorrow.paperai.life/https://github.com/14790897

## 自己搭建步骤

1. 克隆仓库并切换到仓库目录
2. 部署到 cloud flare （使用 wrangler）

   ```sh
   npm install -g wrangler
   wrangler login
   npm install
   wrangler deploy
   ```

3. 在 cloud flare 上配置自定义域名（可选）

## 功能

- 代理功能：拦截并通过 Cloudflare Worker 转发到目标网站的请求。
- 自动 URL 重写：修改 HTML 内容中的相对 URL，使它们通过代理加载。
- Cookie 记录：在 Cookie 中存储当前访问的目标网站，以便处理后续特殊地直接对根路径请求时不需要再次提供完整的 URL。
- service worker: 拦截非代理网站的请求，使得它们也走代理

## 体验网址

https://tomorrow.paperai.life
旧版：https://future.paperai.life

## 演示视频

https://www.youtube.com/watch?v=cJs7C6rQheA
<!-- ## 参考项目

https://github.com/gaboolic/cloudflare-reverse-proxy -->

## 许可证

本项目基于 GNU Affero General Public License v3.0 发布。您可以自由地复制、分发和修改本项目，但修改后和衍生的作品必须同样以 AGPLv3 协议发布。有关详细信息，请参阅 LICENSE 文件或访问以下链接：https://www.gnu.org/licenses/agpl-3.0.en.html
