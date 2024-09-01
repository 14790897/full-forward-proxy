这个不行啊因为它这个资源路径可以是动态加载的，但是你是无法修改动态加载的资源里面的路径的，因为这个是在客户端加载完成的，除非你可以使用插件来修改客户端的路径，但这也挺难


注意location头部的修改
参考
https://github.com/gaboolic/cloudflare-reverse-proxy
https://github.com/BomberFish/Infrared
https://github.com/netptop/siteproxy
https://github.com/1234567Yang/cf-proxy-ex //这个效果不行
https://github.com/fscarmen2/Argo-Xray-JS-PaaS
https://github.com/playGitboy/YuFoLunChan/blob/main/%E4%B8%8E%E4%BD%9B%E8%AE%BA%E7%A6%85.py
https://github.com/EtherDream/jsproxy



## IP有问题会影响到wrangler的部署


## 思考：	sw可以在响应头中添加 CORS 支持, 怀疑有些网页上自己的请求它可能会发出CORS预检，而这里没有代理，但其实是错误的因为SW仍然可以直接拦截cors请求，给到后端修改








备份
### Which Cloudflare product(s) does this pertain to?

Wrangler

### What version(s) of the tool(s) are you using?

3.73.0

### What version of Node are you using?

v20.11.1

### What operating system and version are you using?

Windows 11

### Describe the Bug

### Observed behavior
 wrangler deploy

 ⛅️ wrangler 3.73.0
-------------------


X [ERROR] A request to the Cloudflare API (/accounts/f044a2ee45ac94aa39f30e9b876b7333/workers/services/full-forward-proxy-tomorrow) failed.

  Please wait and consider throttling your request speed [code: 971]

  If you think this is a bug, please open an issue at:
  https://github.com/cloudflare/workers-sdk/issues/new/choose


### Steps to reproduce
wrangler deploy
code repo: https://github.com/14790897/full-forward-proxy


### Please provide a link to a minimal reproduction

https://github.com/14790897/full-forward-proxy

### Please provide any relevant error logs

_No response_
