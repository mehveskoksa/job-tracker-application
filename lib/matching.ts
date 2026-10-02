import { ArbeitnowJob } from "@/lib/arbeitnow";

export type UserPreferences = {
  skills: string[];
  desiredRole: string | null;
  desiredLocation: string | null;
  desiredJobType: string | null;
  desiredWorkMode: string | null;
};

export type ScoredJob = ArbeitnowJob & {
  matchScore: number;
};

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function textContains(haystack: string, needle: string): boolean {
  return normalize(haystack).includes(normalize(needle));
}

export function scoreJob(
  job: ArbeitnowJob,
  preferences: UserPreferences
): number {
  let score = 0;
  let maxScore = 0;

  // 1. Skills vs tags + title (weight: 40)
  maxScore += 40;
  if (preferences.skills.length > 0) {
    const jobText = normalize(
      [job.title, ...job.tags].join(" ")
    );
    const matchedSkills = preferences.skills.filter((skill) =>
      jobText.includes(normalize(skill))
    );
    score += (matchedSkills.length / preferences.skills.length) * 40;
  } else {
    // No skills set — don't penalize, treat as neutral
    maxScore -= 40;
  }

  // 2. Desired role vs title (weight: 25)
  maxScore += 25;
  if (preferences.desiredRole) {
    if (textContains(job.title, preferences.desiredRole)) {
      score += 25;
    } else {
      // Partial credit for shared words
      const roleWords = normalize(preferences.desiredRole).split(/\s+/);
      const titleNorm = normalize(job.title);
      const matchedWords = roleWords.filter((w) => w.length > 2 && titleNorm.includes(w));
      if (roleWords.length > 0) {
        score += (matchedWords.length / roleWords.length) * 25;
      }
    }
  } else {
    maxScore -= 25;
  }

  // 3. Location / work mode (weight: 20)
  maxScore += 20;
  if (preferences.desiredWorkMode === "REMOTE") {
    if (job.remote) score += 20;
  } else if (preferences.desiredLocation) {
    if (job.remote || textContains(job.location, preferences.desiredLocation)) {
      score += 20;
    }
  } else {
    maxScore -= 20;
  }

  // 4. Job type (weight: 15)
  maxScore += 15;
  if (preferences.desiredJobType) {
    const desired = preferences.desiredJobType.replace("_", " ");
    const jobTypeText = normalize(job.jobTypes.join(" "));
    if (jobTypeText.includes(normalize(desired).split(" ")[0])) {
      score += 15;
    }
  } else {
    maxScore -= 15;
  }

  if (maxScore <= 0) return 50; // no preferences set at all — neutral score

  return Math.round((score / maxScore) * 100);
}

export function scoreAndSortJobs(
  jobs: ArbeitnowJob[],
  preferences: UserPreferences
): ScoredJob[] {
  return jobs
    .map((job) => ({ ...job, matchScore: scoreJob(job, preferences) }))
    .sort((a, b) => b.matchScore - a.matchScore);
}
