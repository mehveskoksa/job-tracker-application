"use client";

import { useEffect, useState } from "react";

type JobType = "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT" | "";
type WorkMode = "REMOTE" | "ONSITE" | "HYBRID" | "";

type ProfileData = {
  id: string;
  email: string;
  name: string | null;
  skills: string[];
  desiredRole: string | null;
  desiredLocation: string | null;
  desiredJobType: JobType | null;
  desiredWorkMode: WorkMode | null;
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [desiredRole, setDesiredRole] = useState("");
  const [desiredLocation, setDesiredLocation] = useState("");
  const [desiredJobType, setDesiredJobType] = useState<JobType>("");
  const [desiredWorkMode, setDesiredWorkMode] = useState<WorkMode>("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load profile.");
          setLoading(false);
          return;
        }

        const user: ProfileData = data.user;
        setEmail(user.email);
        setName(user.name || "");
        setSkillsInput(user.skills.join(", "));
        setDesiredRole(user.desiredRole || "");
        setDesiredLocation(user.desiredLocation || "");
        setDesiredJobType((user.desiredJobType as JobType) || "");
        setDesiredWorkMode((user.desiredWorkMode as WorkMode) || "");
        setLoading(false);
      } catch {
        setError("Failed to load profile.");
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    const skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          skills,
          desiredRole,
          desiredLocation,
          desiredJobType: desiredJobType || null,
          desiredWorkMode: desiredWorkMode || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save profile.");
        setSaving(false);
        return;
      }

      setSuccess(true);
      setSaving(false);
    } catch {
      setError("Failed to save profile.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-zinc-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <h1 className="text-xl font-semibold text-zinc-900">Your profile</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Keep your info up to date for better job matches.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="mt-1 w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Skills
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="e.g. Python, React, PostgreSQL"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-400">
              Comma-separated list of your skills.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Desired role
            </label>
            <input
              type="text"
              value={desiredRole}
              onChange={(e) => setDesiredRole(e.target.value)}
              placeholder="e.g. Backend Engineer"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Desired location
            </label>
            <input
              type="text"
              value={desiredLocation}
              onChange={(e) => setDesiredLocation(e.target.value)}
              placeholder="e.g. Padua, Italy or Remote"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Job type
              </label>
              <select
                value={desiredJobType}
                onChange={(e) =>
                  setDesiredJobType(e.target.value as JobType)
                }
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              >
                <option value="">Any</option>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Work mode
              </label>
              <select
                value={desiredWorkMode}
                onChange={(e) =>
                  setDesiredWorkMode(e.target.value as WorkMode)
                }
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              >
                <option value="">Any</option>
                <option value="REMOTE">Remote</option>
                <option value="ONSITE">Onsite</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && (
            <p className="text-sm text-green-600">Profile saved.</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-2 w-fit rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
