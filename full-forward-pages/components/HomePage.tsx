// pages/proxy.js
import { useState } from 'react';

export default function HomePage() {
	const [url, setUrl] = useState('');

	const handleSubmit = (event: any) => {
		event.preventDefault();
		const proxyUrl = `/proxy/${url}`;
		window.location.href = proxyUrl;
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
			<h1 className="text-2xl font-bold text-gray-700 mb-8">输入您想访问的网址</h1>
			<form onSubmit={handleSubmit} className="bg-white shadow-lg p-8 rounded-lg">
				<input
					type="text"
					className="block w-full p-4 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="https://example.com"
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
