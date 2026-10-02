import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { fetchArbeitnowJobs, type ArbeitnowJob } from "@/lib/arbeitnow";
import { scoreAndSortJobs, type ScoredJob } from "@/lib/matching";

const CACHE_KEY = "arbeitnow:jobs";
const CACHE_TTL_SECONDS = 60 * 10; // 10 minutes
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// Strips the heavy HTML description and replaces it with a short plain-text snippet
function toListItem(job: ScoredJob) {
  const { description, ...rest } = job;
  const snippet = description
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

  return { ...rest, snippet };
}

// Returns raw listings from Redis if cached, otherwise fetches from Arbeitnow
// and stores them. Redis failures never break the request.
async function getJobs(): Promise<{ jobs: ArbeitnowJob[]; cached: boolean }> {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return { jobs: JSON.parse(cached) as ArbeitnowJob[], cached: true };
    }
  } catch (error) {
    console.error("Redis read failed:", error);
  }

  const jobs = await fetchArbeitnowJobs();

  try {
    await redis.set(CACHE_KEY, JSON.stringify(jobs), "EX", CACHE_TTL_SECONDS);
  } catch (error) {
    console.error("Redis write failed:", error);
  }

  return { jobs, cached: false };
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      skills: true,
      desiredRole: true,
      desiredLocation: true,
      desiredJobType: true,
      desiredWorkMode: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const requestedLimit = Number(searchParams.get("limit")) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);

  try {
    const { jobs, cached } = await getJobs();
    const scored = scoreAndSortJobs(jobs, user);

    return NextResponse.json({
      total: scored.length,
      cached,
      jobs: scored.slice(0, limit).map(toListItem),
    });
  } catch (error) {
    console.error("Failed to load jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch job listings" },
      { status: 502 }
    );
  }
}
