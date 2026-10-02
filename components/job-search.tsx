"use client";

import { useEffect, useState } from "react";

type JobListItem = {
  slug: string;
  title: string;
  company: string;
  remote: boolean;
  url: string;
  tags: string[];
  jobTypes: string[];
  location: string;
  createdAt: number;
  matchScore: number;
  snippet: string;
};

type JobsResponse = {
  total: number;
  cached: boolean;
  jobs: JobListItem[];
};

type ApplicationsResponse = {
  applications: { listingUrl: string | null }[];
};

function badgeClass(score: number): string {
  if (score >= 60) return "bg-emerald-100 text-emerald-800";
  if (score >= 35) return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-700";
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function JobSearch() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [trackedUrls, setTrackedUrls] = useState<Set<string>>(new Set());
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [jobsRes, appsRes] = await Promise.all([
          fetch("/api/jobs?limit=50"),
          fetch("/api/applications"),
        ]);

        if (!jobsRes.ok) throw new Error("Failed to load job listings");

        const jobsData: JobsResponse = await jobsRes.json();
        setJobs(jobsData.jobs);
        setTotal(jobsData.total);

        if (appsRes.ok) {
          const appsData: ApplicationsResponse = await appsRes.json();
          const urls = appsData.applications
            .map((application) => application.listingUrl)
            .filter((url): url is string => Boolean(url));
          setTrackedUrls(new Set(urls));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handleTrack(job: JobListItem) {
    setPendingUrl(job.url);
    setError(null);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: job.title,
          company: job.company,
          location: job.location,
          remote: job.remote,
          jobTypes: job.jobTypes,
          url: job.url,
        }),
      });

      if (!res.ok) throw new Error("Could not track this job");

      setTrackedUrls((previous) => new Set(previous).add(job.url));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingUrl(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-600">Loading listings...</p>;
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="mb-4 text-sm text-gray-500">
        Showing {jobs.length} of {total} listings
      </p>

      <ul className="space-y-4">
        {jobs.map((job) => {
          const isTracked = trackedUrls.has(job.url);
          const isPending = pendingUrl === job.url;

          return (
            <li
              key={job.slug}
              className="rounded-lg border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900">
                    {job.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {job.company} · {job.location || "Location not specified"}
                    {job.remote ? " · Remote" : ""}
                  </p>
                </div>
                <span
                  className={
                    "shrink-0 rounded-full px-3 py-1 text-xs font-semibold " +
                    badgeClass(job.matchScore)
                  }
                >
                  {job.matchScore}% match
                </span>
              </div>

              <p className="mt-3 text-sm text-gray-700">{job.snippet}</p>

              {job.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.tags.slice(0, 6).map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Posted {formatDate(job.createdAt)}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    View listing
                  </a>
                  <button
                    type="button"
                    onClick={() => handleTrack(job)}
                    disabled={isTracked || isPending}
                    className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                  >
                    {isTracked ? "Tracked" : isPending ? "Adding..." : "Track"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
