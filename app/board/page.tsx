import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import KanbanBoard, { type BoardApplication } from "@/components/kanban-board";

export default async function BoardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  const initialApplications: BoardApplication[] = applications.map(
    (application) => ({
      id: application.id,
      company: application.company,
      position: application.position,
      status: application.status,
      location: application.location,
      jobType: application.jobType,
      workMode: application.workMode,
      listingUrl: application.listingUrl,
    })
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Board</h1>
      <p className="mt-1 mb-6 text-sm text-gray-600">
        Drag cards between columns to update their status.
      </p>
      <KanbanBoard initialApplications={initialApplications} />
    </main>
  );
}
