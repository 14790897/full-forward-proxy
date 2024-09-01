import { Hono } from 'hono';
import { handleEvent } from './route.js';

const app = new Hono();
const excludedPaths = [
	'/',
	'/service-worker.js',
	'/favicon.ico',
	'/util.js',
	'/android-chrome-192x192.png',
	'/android-chrome-512x512.png',
	'/apple-touch-icon.png',
	'/favicon-16x16.png',
	'/favicon-32x32.png',
	'/manifest.json',
	'site.webmanifest',
];

excludedPaths.forEach((path) => {
	app.get(path, async (c) => {
		return handleEvent(c.event);
	});
});

app.all('*', async (c) => {
	const request = c.req;
	const url = new URL(request.url);
	const prefix = `${url.origin}/`;

	let actualUrlStr;

	if (!url.pathname.startsWith('/http')) {
		const cookie = request.header('Cookie');
		if (cookie) {
			const cookieObj = Object.fromEntries(
				cookie.split(';').map((cookie) => {
					const [key, ...val] = cookie.trim().split('=');
					return [key.trim(), val.join('=').trim()];
				})
			);
			if (cookieObj.current_site) {
				actualUrlStr = `${decodeURIComponent(cookieObj.current_site)}${url.pathname}${url.search}${url.hash}`;
				console.log('actualUrlStr in cookieObj:', actualUrlStr);
				const actualUrl = new URL(actualUrlStr);
				const redirectUrl = `${prefix}${actualUrl}`;
				return c.redirect(redirectUrl, 301);
			} else {
				return c.text(`No website in cookie. Please visit a website first.`, 400);
			}
		} else {
			return c.text(`No cookie found. Please visit a website first.`, 400);
		}
	} else {
		actualUrlStr = url.pathname.replace('/', '') + url.search + url.hash;
	}

	const actualUrl = new URL(actualUrlStr);
	const actualOrigin = actualUrl.origin;

	const newHeaders = new Headers(request.raw.headers);
	newHeaders.set('Referer', actualOrigin);
	newHeaders.set('Origin', actualOrigin);

	const modifiedRequest = new Request(actualUrl, {
		headers: newHeaders,
		method: request.method,
		body: request.clone().body,
		redirect: 'follow',
	});

	let response = await fetch(modifiedRequest);
	const baseUrl = `${prefix}${actualOrigin}`;

	if (response.headers.get('Content-Type')?.includes('text/html')) {
		response = await updateRelativeUrls(response, baseUrl, prefix);
	}

	const responseBody = await response.text();
	const modifiedResponse = new Response(responseBody, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});

	modifiedResponse.headers.delete('Content-Security-Policy');
	modifiedResponse.headers.delete('X-Content-Security-Policy');
	modifiedResponse.headers.delete('X-WebKit-CSP');
	modifiedResponse.headers.delete('Permissions-Policy');
	modifiedResponse.headers.set('X-Frame-Options', 'ALLOWALL');
	modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
	modifiedResponse.headers.delete('Strict-Transport-Security');
	modifiedResponse.headers.delete('X-Download-Options');
	modifiedResponse.headers.delete('X-Content-Type-Options');
	modifiedResponse.headers.delete('Feature-Policy');

	return c.body(responseBody, 200, {
		headers: modifiedResponse.headers,
	});
});

async function updateRelativeUrls(response, baseUrl, prefix) {
	let text = await response.text();

	text = text.replace(/(href|src|action)="([^"]*?)"/g, (match, p1, p2) => {
		if (!p2.startsWith('http') && !p2.startsWith('#')) {
			return `${p1}="${baseUrl}${p2}"`;
		} else if (p2.startsWith('http')) {
			return `${p1}="${prefix}${p2}"`;
		}
		return match;
	});

	const swRegistrationScript = `
        <script>
            navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
                console.log('Service Worker registered with scope:', registration.scope);
            }).catch(function(error) {
                console.log('Service Worker registration failed:', error);
            });
            navigator.serviceWorker.addEventListener('message', (event) => {
                const currentSite = event.data.currentSite;
                if (currentSite) {
                    document.cookie = "current_site="+ currentSite + "; path=/; Secure";
                    console.log('current_site saved to cookie in index:', currentSite);
                }
            });
        </script>
    `;
	text = text.replace('</head>', `${swRegistrationScript}</head>`);

	const analyticsScript = `
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-N5PKF1XT49"></script>
        <script>
            window.dataLayer = window.dataLayer || [];
            function gtag() {
                dataLayer.push(arguments);
            }
            gtag('js', new Date());
            gtag('config', 'G-N5PKF1XT49');
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a.q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "nt4hmun44h");
        </script>
    `;
	text = text.replace('</body>', `${analyticsScript}</body>`);

	return new Response(text, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});
}

export default app;
