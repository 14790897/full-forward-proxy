'use client';
import { useEffect } from 'react';

export default function Service() {
	useEffect(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker
				.register('/service-worker.js')
				.then((registration) => {
					console.log('Service Worker registered with scope:', registration.scope);
				})
				.catch((error) => {
					console.log('Service Worker registration failed:', error);
				});
		}
	}, []);
	return null;
}
