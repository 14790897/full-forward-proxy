addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  if (url.pathname === "/" || url.pathname === "/proxy/") {
    return new Response("hello, world", {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const actualUrlStr =
    url.pathname.replace("/proxy/", "") + url.search + url.hash; //使用的只有pathname
  const actualUrl = new URL(actualUrlStr);
  const actualOrigin = actualUrl.origin;
  const modifiedRequest = new Request(actualUrl, {
    headers: request.headers,
    method: request.method,
    body: request.body,
    redirect: "follow",
  });

  let response = await fetch(modifiedRequest);

  if (response.headers.get("Content-Type")?.includes("text/html")) {
    response = await updateRelativeUrls(
      response,
      `${url.origin}/proxy/${actualOrigin}`
    );
  }

  const modifiedResponse = new Response(response.body, response);
  modifiedResponse.headers.set("Access-Control-Allow-Origin", "*");

  return modifiedResponse;
}

async function updateRelativeUrls(response, baseUrl) {
  let text = await response.text();
  // 替换HTML中的相对路径
  text = text.replace(/(href|src|action)="([^"]*)"/g, (match, p1, p2) => {
    if (!p2.includes("://") && !p2.startsWith("#")) {
      return `${p1}="${baseUrl}${p2}"`;
    }
    return match;
  });

  // 在 </body> 之前注入 JavaScript 代码
  const scriptToInject = `
    <script>
      console.log('This script has been injected from cf workers.');
      document.querySelectorAll('a').forEach(function(link) {
    link.href = 'http://your-proxy-server/' + encodeURIComponent(link.href);
});

document.querySelectorAll('img, script, link').forEach(function(tag) {
    let src = tag.src || tag.href;
    if (src) {
        let proxyUrl = 'http://your-proxy-server/' + encodeURIComponent(src);
        if (tag.src) tag.src = proxyUrl;
        if (tag.href) tag.href = proxyUrl;
    }
});
    </script>
  `;

  text = text.replace("</body>", `${scriptToInject}</body>`);

  return new Response(text, {
    headers: response.headers,
  });
}
