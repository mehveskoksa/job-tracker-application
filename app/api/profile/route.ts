import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
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

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const {
      name,
      skills,
      desiredRole,
      desiredLocation,
      desiredJobType,
      desiredWorkMode,
    } = body;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name ?? undefined,
        skills: Array.isArray(skills) ? skills : undefined,
        desiredRole: desiredRole ?? undefined,
        desiredLocation: desiredLocation ?? undefined,
        desiredJobType: desiredJobType || null,
        desiredWorkMode: desiredWorkMode || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        skills: true,
        desiredRole: true,
        desiredLocation: true,
        desiredJobType: true,
        desiredWorkMode: true,
      },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
