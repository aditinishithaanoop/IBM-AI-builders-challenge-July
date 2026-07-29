export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-300">
      {message}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-zinc-200 dark:border-zinc-700 px-4 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
      {message}
    </div>
  );
}