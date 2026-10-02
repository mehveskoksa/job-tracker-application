"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

export type ApplicationStatus =
  | "APPLIED"
  | "INTERVIEWING"
  | "OFFER"
  | "REJECTED";

export type BoardApplication = {
  id: string;
  company: string;
  position: string;
  status: ApplicationStatus;
  location: string | null;
  jobType: string | null;
  workMode: string | null;
  listingUrl: string | null;
};

const COLUMNS: { id: ApplicationStatus; title: string }[] = [
  { id: "APPLIED", title: "Applied" },
  { id: "INTERVIEWING", title: "Interviewing" },
  { id: "OFFER", title: "Offer" },
  { id: "REJECTED", title: "Rejected" },
];

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
};

const WORK_MODE_LABELS: Record<string, string> = {
  REMOTE: "Remote",
  ONSITE: "On-site",
  HYBRID: "Hybrid",
};

function CardBody({
  application,
  onRemove,
}: {
  application: BoardApplication;
  onRemove?: (id: string) => void;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
      <p className="text-sm font-semibold text-gray-900">
        {application.position}
      </p>
      <p className="mt-0.5 text-xs text-gray-600">
        {application.company}
        {application.location ? " · " + application.location : ""}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {application.jobType && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {JOB_TYPE_LABELS[application.jobType] ?? application.jobType}
          </span>
        )}
        {application.workMode && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {WORK_MODE_LABELS[application.workMode] ?? application.workMode}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        {application.listingUrl ? (
          <a
            href={application.listingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 underline hover:text-gray-900"
          >
            View listing
          </a>
        ) : (
          <span />
        )}
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(application.id)}
            className="text-gray-500 hover:text-red-600"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  application,
  onRemove,
}: {
  application: BoardApplication;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: application.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={
        "cursor-grab active:cursor-grabbing " + (isDragging ? "opacity-40" : "")
      }
    >
      <CardBody application={application} onRemove={onRemove} />
    </div>
  );
}

function Column({
  id,
  title,
  count,
  children,
}: {
  id: ApplicationStatus;
  title: string;
  count: number;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      className={
        "flex min-h-64 flex-col rounded-lg p-3 transition-colors " +
        (isOver ? "bg-gray-200" : "bg-gray-100")
      }
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-600">
          {count}
        </span>
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default function KanbanBoard({
  initialApplications,
}: {
  initialApplications: BoardApplication[];
}) {
  const [applications, setApplications] =
    useState<BoardApplication[]>(initialApplications);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [locationFilter, setLocationFilter] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [workModeFilter, setWorkModeFilter] = useState("");

  const normalizedLocation = locationFilter.trim().toLowerCase();
  const hasActiveFilters = Boolean(
    normalizedLocation || jobTypeFilter || workModeFilter
  );

  const visibleApplications = applications.filter((application) => {
    if (
      normalizedLocation &&
      !(application.location ?? "").toLowerCase().includes(normalizedLocation)
    ) {
      return false;
    }
    if (jobTypeFilter && application.jobType !== jobTypeFilter) return false;
    if (workModeFilter && application.workMode !== workModeFilter) return false;
    return true;
  });

  function clearFilters() {
    setLocationFilter("");
    setJobTypeFilter("");
    setWorkModeFilter("");
  }

  // A small drag distance keeps clicks on links and buttons working
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const activeApplication =
    applications.find((application) => application.id === activeId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);

    const { active, over } = event;
    if (!over) return;

    const id = String(active.id);
    const newStatus = String(over.id) as ApplicationStatus;

    if (!COLUMNS.some((column) => column.id === newStatus)) return;

    const current = applications.find((application) => application.id === id);
    if (!current || current.status === newStatus) return;

    const previousStatus = current.status;
    setError(null);

    // Optimistic update, reverted if saving fails
    setApplications((previous) =>
      previous.map((application) =>
        application.id === id ? { ...application, status: newStatus } : application
      )
    );

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Could not save the new status");
    } catch (err) {
      setApplications((previous) =>
        previous.map((application) =>
          application.id === id
            ? { ...application, status: previousStatus }
            : application
        )
      );
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleRemove(id: string) {
    if (!window.confirm("Remove this application from your board?")) return;

    setError(null);

    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove the application");

      setApplications((previous) =>
        previous.filter((application) => application.id !== id)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Location
          <input
            type="text"
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
            placeholder="e.g. Berlin"
            className="w-48 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Job type
          <select
            value={jobTypeFilter}
            onChange={(event) => setJobTypeFilter(event.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
          >
            <option value="">All</option>
            {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Work mode
          <select
            value={workModeFilter}
            onChange={(event) => setWorkModeFilter(event.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
          >
            <option value="">All</option>
            {Object.entries(WORK_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Clear filters
          </button>
        )}

        {hasActiveFilters && (
          <span className="pb-2 text-xs text-gray-500">
            Showing {visibleApplications.length} of {applications.length}
          </span>
        )}
      </div>

      {applications.length === 0 && (
        <p className="mb-4 text-sm text-gray-600">
          Nothing tracked yet.{" "}
          <Link href="/search" className="underline">
            Find jobs to track
          </Link>
          .
        </p>
      )}

      <DndContext
        id="kanban-board"
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => {
            const items = visibleApplications.filter(
              (application) => application.status === column.id
            );

            return (
              <Column
                key={column.id}
                id={column.id}
                title={column.title}
                count={items.length}
              >
                {items.map((application) => (
                  <DraggableCard
                    key={application.id}
                    application={application}
                    onRemove={handleRemove}
                  />
                ))}
              </Column>
            );
          })}
        </div>

        <DragOverlay>
          {activeApplication ? <CardBody application={activeApplication} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
