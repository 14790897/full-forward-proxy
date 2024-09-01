这个不行啊因为它这个资源路径可以是动态加载的，但是你是无法修改动态加载的资源里面的路径的，因为这个是在客户端加载完成的，除非你可以使用插件来修改客户端的路径，但这也挺难

注意 location 头部的修改
参考
https://github.com/gaboolic/cloudflare-reverse-proxy
https://github.com/BomberFish/Infrared
https://github.com/netptop/siteproxy
https://github.com/1234567Yang/cf-proxy-ex //这个效果不行
https://github.com/fscarmen2/Argo-Xray-JS-PaaS
https://github.com/playGitboy/YuFoLunChan/blob/main/%E4%B8%8E%E4%BD%9B%E8%AE%BA%E7%A6%85.py
https://github.com/EtherDream/jsproxy

## IP 有问题会影响到 wrangler 的部署

## 思考： sw 可以在响应头中添加 CORS 支持, 怀疑有些网页上自己的请求它可能会发出 CORS 预检，而这里没有代理，但其实是错误的因为 SW 仍然可以直接拦截 cors 请求，给到后端修改

## 思考： "/https://google.com/gen_204", error:TypeError: A request with a one-time-use body (it was initialized from a stream, not a buffer) encountered a redirect requiring the body to be retransmitted. To avoid this error in the future, construct this request from a buffer-like body initializer.

在发出一个带有“流”作为请求体的 HTTP 请求时，遇到了一个重定向（redirect）响应。由于 HTTP 重定向要求重新发送请求，而请求体是流式的，不能重复读取，导致了这个错误，这就说明在进行流式请求的时候不能进行重定向，需要对此进行区分，这个是我的499错误触发的
