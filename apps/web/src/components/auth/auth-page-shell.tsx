export function AuthPageShell({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
