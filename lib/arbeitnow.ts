export type ArbeitnowJob = {
  slug: string;
  title: string;
  company: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  jobTypes: string[];
  location: string;
  createdAt: number;
};

type ArbeitnowApiResponse = {
  data: {
    slug: string;
    company_name: string;
    title: string;
    description: string;
    remote: boolean;
    url: string;
    tags: string[];
    job_types: string[];
    location: string;
    created_at: number;
  }[];
};

const ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api";

export async function fetchArbeitnowJobs(): Promise<ArbeitnowJob[]> {
  const res = await fetch(ARBEITNOW_API_URL, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Arbeitnow API request failed with status ${res.status}`);
  }

  const json: ArbeitnowApiResponse = await res.json();

  return json.data.map((job) => ({
    slug: job.slug,
    title: job.title,
    company: job.company_name,
    description: job.description,
    remote: job.remote,
    url: job.url,
    tags: job.tags || [],
    jobTypes: job.job_types || [],
    location: job.location || "",
    createdAt: job.created_at,
  }));
}
