import { AppImage } from '@/components/ui/image';

export default function HomePage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <AppImage
        src="/logo.svg"
        alt="Nawhas — a comprehensive digital library of nawha recitations"
        width={200}
        height={60}
        priority
      />
      <h1 className="mt-8 text-4xl font-bold">Nawhas</h1>
      <p className="mt-4 text-xl text-gray-600">
        A comprehensive digital library of nawha recitations.
      </p>
    </main>
  );
}
