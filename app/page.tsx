import TaskTable from '@/components/TaskTable';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex justify-end">
          <Link
            href="/meeting"
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            Meeting → Action Items →
          </Link>
        </div>
        <TaskTable />
      </div>
    </main>
  );
}
