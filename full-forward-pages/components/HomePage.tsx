'use client';
import { useState } from 'react';

export default function HomePage() {
	const [url, setUrl] = useState('https://github.com/14790897');

	const handleSubmit = (event: any) => {
		event.preventDefault();
		// 使用 encodeURIComponent 对 URL 进行编码
		const encodedUrl = encodeURIComponent(url);
		const proxyUrl = `/proxy/${encodedUrl}`;
		window.location.href = proxyUrl;
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
			<h1 className="text-2xl font-bold text-gray-700 mb-8">输入您想访问的网址</h1>
			<form onSubmit={handleSubmit} className="bg-white shadow-lg p-8 rounded-lg">
				<input
					type="text"
					className="block w-full p-4 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="https://github.com/14790897"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					required
				/>
				<button
					type="submit"
					className="w-full p-4 bg-blue-500 text-white text-lg font-semibold rounded-lg hover:bg-blue-600 transition-colors"
				>
					访问
				</button>
			</form>
		</div>
	);
}
