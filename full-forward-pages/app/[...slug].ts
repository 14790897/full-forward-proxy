import { NextResponse } from 'next/server';

export async function GET(request) {
	try {
		const url = new URL(request.url);

		let actualUrlStr;

		if (!url.pathname.startsWith('/api/proxy/')) {
			// Read the previously visited site from cookies
			const cookie = request.headers.get('cookie');
			if (cookie) {
				const cookieObj = Object.fromEntries(
					cookie.split(';').map((cookie) => {
						const [key, ...val] = cookie.trim().split('=');
						return [key.trim(), val.join('=').trim()];
					})
				);
				if (cookieObj.current_site) {
					actualUrlStr = decodeURIComponent(cookieObj.current_site) + url.pathname + url.search + url.hash;
					console.log('actualUrlStr in cookieObj:', actualUrlStr);
					const actualUrl = new URL(actualUrlStr);
					const redirectUrl = `${url.origin}/api/proxy/${actualUrl}`;
					return NextResponse.redirect(redirectUrl, 301);
				} else {
					return new NextResponse(`No website in cookie. Please visit a website first.`, {
						status: 400,
						headers: { 'Content-Type': 'text/plain' },
					});
				}
			} else {
				return new NextResponse(`No cookie found. Please visit a website first.`, {
					status: 400,
					headers: { 'Content-Type': 'text/plain' },
				});
			}
		} else {
			actualUrlStr = url.pathname.replace('/api/proxy/', '') + url.search + url.hash;
		}

		const actualUrl = new URL(actualUrlStr);
		const modifiedRequest = new Request(actualUrl, {
			headers: request.headers,
			method: request.method,
			body: request.body,
			redirect: 'follow',
		});

		let response = await fetch(modifiedRequest);
		const baseUrl = `${url.origin}/api/proxy/${actualUrl.origin}`;
		if (response.headers.get('Content-Type')?.includes('text/html')) {
			response = await updateRelativeUrls(response, baseUrl, `${url.origin}/api/proxy/`);
		}

		const modifiedResponse = new NextResponse(response.body, {
			headers: response.headers,
		});
		modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
		const currentSiteCookie = `current_site=${encodeURIComponent(actualUrl.origin)}; Path=/;  Secure`;
		modifiedResponse.headers.append('Set-Cookie', currentSiteCookie);

		return modifiedResponse;
	} catch (e) {
		return new NextResponse(`"${new URL(request.url).pathname}" not found`, {
			status: 404,
			statusText: 'Not Found',
		});
	}
}

async function updateRelativeUrls(response, baseUrl, prefix) {
	let text = await response.text();

	text = text.replace(/(href|src|action)="([^"]*?)"/g, (match, p1, p2) => {
		if (!p2.includes('://') && !p2.startsWith('#')) {
			return `${p1}="${baseUrl}${p2}"`;
		} else if (p2.includes('://') && !match.includes('js') && !match.includes('css') && !match.includes('mjs')) {
			return `${p1}="${prefix}${p2}"`;
		}
		return match;
	});

	return new Response(text, {
		headers: response.headers,
	});
}
