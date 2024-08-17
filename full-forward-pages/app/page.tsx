import Service from '@/components/Service';
import HomePage from '@/components/HomePage';
export default function Home() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-between p-24">
			<HomePage />
			<Service />
		</main>
	);
}
