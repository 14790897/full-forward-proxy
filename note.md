这个不行啊因为它这个资源路径可以是动态加载的，但是你是无法修改动态加载的资源里面的路径的，因为这个是在客户端加载完成的，除非你可以使用插件来修改客户端的路径，但这也挺难


注意location头部的修改
参考
https://github.com/gaboolic/cloudflare-reverse-proxy
https://github.com/BomberFish/Infrared
https://github.com/14790897/siteproxy
https://github.com/1234567Yang/cf-proxy-ex
