import TaskTable from '@/components/TaskTable';

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <TaskTable />
      </div>
    </main>
  );
}
