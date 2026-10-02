import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type JobTypeValue = "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT";
type WorkModeValue = "REMOTE" | "ONSITE" | "HYBRID";

function asString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

// Maps free-text Arbeitnow job types (e.g. "Full time", "Working student")
// to our JobType enum. Returns null when nothing matches.
function mapJobType(jobTypes: string[]): JobTypeValue | null {
  const text = jobTypes.join(" ").toLowerCase();
  if (/intern|praktik/.test(text)) return "INTERNSHIP";
  if (/part|teilzeit/.test(text)) return "PART_TIME";
  if (/contract|freelance/.test(text)) return "CONTRACT";
  if (/full|vollzeit/.test(text)) return "FULL_TIME";
  return null;
}

function mapWorkMode(remote: boolean, location: string): WorkModeValue {
  if (remote || /remote|homeoffice|home office/i.test(location)) return "REMOTE";
  if (/hybrid/i.test(location)) return "HYBRID";
  return "ONSITE";
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ applications });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const position = asString(body.title, 200);
  const company = asString(body.company, 200);
  const listingUrl = asString(body.url, 2000);
  const location = asString(body.location, 200);
  const remote = body.remote === true;
  const jobTypes = Array.isArray(body.jobTypes)
    ? body.jobTypes.filter((item): item is string => typeof item === "string")
    : [];

  if (!position || !company || !listingUrl) {
    return NextResponse.json(
      { error: "title, company and url are required" },
      { status: 400 }
    );
  }

  if (!/^https?:\/\//i.test(listingUrl)) {
    return NextResponse.json({ error: "Invalid listing URL" }, { status: 400 });
  }

  // Prevent tracking the same listing twice
  const existing = await prisma.application.findFirst({
    where: { userId, listingUrl },
  });

  if (existing) {
    return NextResponse.json(
      { application: existing, alreadyTracked: true },
      { status: 200 }
    );
  }

  const application = await prisma.application.create({
    data: {
      userId,
      company,
      position,
      listingUrl,
      location,
      jobType: mapJobType(jobTypes),
      workMode: mapWorkMode(remote, location ?? ""),
    },
  });

  return NextResponse.json(
    { application, alreadyTracked: false },
    { status: 201 }
  );
}
