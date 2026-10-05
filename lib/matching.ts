import { ArbeitnowJob } from "@/lib/arbeitnow";
import { htmlToPlainText } from "@/lib/text";

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

export type MatchResult = {
  jobs: ScoredJob[];
  hiddenCount: number;
};

const ROLE_WEIGHT = 35;
const SKILLS_WEIGHT = 35;
const LOCATION_WEIGHT = 20;
const JOB_TYPE_WEIGHT = 10;
const MIN_ROLE_RATIO = 0.3;
const MAX_SKILLS_EXPECTED = 5;

// Lowercase, strip accents and unify spelling variants such as "full-stack" / "full stack"
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/full[\s-]?stack/g, "fullstack")
    .replace(/back[\s-]?end/g, "backend")
    .replace(/front[\s-]?end/g, "frontend")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-term match, so "java" does not match "javascript"
function containsTerm(haystack: string, term: string): boolean {
  if (!term) return false;
  const pattern = new RegExp(
    `(?<![a-z0-9])${escapeRegExp(term)}(?![a-z0-9])`
  );
  return pattern.test(haystack);
}

// ---------- Role ----------

const GENERIC_ROLE_WORDS = new Set([
  "developer",
  "engineer",
  "programmer",
  "entwickler",
  "sviluppatore",
  "manager",
  "specialist",
  "consultant",
  "senior",
  "junior",
  "lead",
  "staff",
  "principal",
  "mid",
]);

const IGNORED_ROLE_WORDS = new Set(["and", "the", "for", "und", "der", "die", "das"]);

const ROLE_TERMS: Record<string, { exact: string[]; related: string[] }> = {
  fullstack: {
    exact: ["fullstack"],
    related: ["backend", "frontend", "software", "web"],
  },
  backend: { exact: ["backend"], related: ["fullstack", "software"] },
  frontend: { exact: ["frontend"], related: ["fullstack", "software", "web"] },
  developer: {
    exact: ["developer", "entwickler", "sviluppatore", "programmer", "programmatore"],
    related: ["engineer", "ingenieur"],
  },
  engineer: {
    exact: ["engineer", "ingenieur"],
    related: ["developer", "entwickler"],
  },
  software: { exact: ["software"], related: ["developer", "engineer"] },
};

// 0..1 how well the job title fits the desired role, null when no role is set
function roleRatio(title: string, desiredRole: string | null): number | null {
  if (!desiredRole) return null;

  const tokens = Array.from(
    new Set(
      normalize(desiredRole)
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 2 && !IGNORED_ROLE_WORDS.has(token))
    )
  );
  if (tokens.length === 0) return null;

  let totalWeight = 0;
  let matchedWeight = 0;

  for (const token of tokens) {
    const weight = GENERIC_ROLE_WORDS.has(token) ? 1 : 3;
    const terms = ROLE_TERMS[token] ?? { exact: [token], related: [] };
    totalWeight += weight;

    if (terms.exact.some((term) => containsTerm(title, term))) {
      matchedWeight += weight;
    } else if (terms.related.some((term) => containsTerm(title, term))) {
      matchedWeight += weight * 0.5;
    }
  }

  return matchedWeight / totalWeight;
}

// ---------- Location ----------

const LOCATION_ALIASES: Record<string, string[]> = {
  veneto: [
    "veneto",
    "padova",
    "padua",
    "venezia",
    "venice",
    "verona",
    "vicenza",
    "treviso",
    "rovigo",
    "belluno",
    "mestre",
  ],
  padova: ["padova", "padua"],
  italy: ["italy", "italia"],
  italia: ["italy", "italia"],
  germany: ["germany", "deutschland"],
  deutschland: ["germany", "deutschland"],
};

function locationTerms(desiredLocation: string | null): string[] {
  if (!desiredLocation) return [];

  const terms = desiredLocation
    .split(/[,;]/)
    .map(normalize)
    .filter(Boolean)
    .flatMap((term) => LOCATION_ALIASES[term] ?? [term]);

  return Array.from(new Set(terms));
}

// ---------- Job type ----------

const JOB_TYPE_PATTERNS: Record<string, RegExp> = {
  FULL_TIME: /full[\s-]?time|vollzeit/,
  PART_TIME: /part[\s-]?time|teilzeit/,
  INTERNSHIP: /\b(intern|internship|praktikum|praktikant|werkstudent|working student)\b/,
  CONTRACT: /\b(contract|freelance)\b/,
};

// ---------- Scoring ----------

type Evaluation = {
  score: number;
  relevant: boolean;
  inArea: boolean;
};

function evaluateJob(
  job: ArbeitnowJob,
  preferences: UserPreferences,
  locationSearchTerms: string[]
): Evaluation {
  const title = normalize(job.title);
  let score = 0;
  let maxScore = 0;

  // 1. Role vs title
  const role = roleRatio(title, preferences.desiredRole);
  if (role !== null) {
    maxScore += ROLE_WEIGHT;
    score += role * ROLE_WEIGHT;
  }

  // 2. Skills vs title, tags and description
  const hasSkills = preferences.skills.length > 0;
  let skillsRelevant = false;

  if (hasSkills) {
    const titleAndTags = normalize([job.title, ...job.tags].join(" "));
    const description = normalize(htmlToPlainText(job.description));

    let titleTagMatches = 0;
    let descriptionOnlyMatches = 0;

    for (const skill of preferences.skills) {
      const term = normalize(skill);
      if (containsTerm(titleAndTags, term)) {
        titleTagMatches += 1;
      } else if (term.length > 2 && containsTerm(description, term)) {
        descriptionOnlyMatches += 1;
      }
    }

    // A job does not need to list every skill you have
    const expected = Math.min(preferences.skills.length, MAX_SKILLS_EXPECTED);
    const ratio = Math.min(
      1,
      (titleTagMatches + 0.5 * descriptionOnlyMatches) / expected
    );

    maxScore += SKILLS_WEIGHT;
    score += ratio * SKILLS_WEIGHT;
    skillsRelevant = titleTagMatches >= 1 || descriptionOnlyMatches >= 2;
  }

  const roleRelevant = role !== null && role >= MIN_ROLE_RATIO;
  const relevant = (role === null && !hasSkills) || roleRelevant || skillsRelevant;

  // 3. Location / work mode
  const wantsRemote = preferences.desiredWorkMode === "REMOTE";
  let inArea = true;

  if (wantsRemote || locationSearchTerms.length > 0) {
    maxScore += LOCATION_WEIGHT;

    const locationText = normalize(job.location);
    const locationMatches = locationSearchTerms.some((term) =>
      containsTerm(locationText, term)
    );

    if (locationMatches) {
      score += LOCATION_WEIGHT;
    } else if (job.remote) {
      score += wantsRemote ? LOCATION_WEIGHT : LOCATION_WEIGHT * 0.6;
    } else {
      inArea = false;
    }
  }

  // 4. Job type
  if (preferences.desiredJobType) {
    maxScore += JOB_TYPE_WEIGHT;

    const pattern = JOB_TYPE_PATTERNS[preferences.desiredJobType];
    const typeText = normalize(job.jobTypes.join(" ") + " " + job.title);

    if (pattern && pattern.test(typeText)) {
      score += JOB_TYPE_WEIGHT;
    } else if (job.jobTypes.length === 0) {
      score += JOB_TYPE_WEIGHT * 0.5;
    }
  }

  const finalScore = maxScore <= 0 ? 50 : Math.round((score / maxScore) * 100);

  return { score: finalScore, relevant, inArea };
}

export function filterAndScoreJobs(
  jobs: ArbeitnowJob[],
  preferences: UserPreferences,
  options: { includeAll?: boolean } = {}
): MatchResult {
  const searchTerms = locationTerms(preferences.desiredLocation);

  const evaluated = jobs.map((job) => ({
    job,
    ...evaluateJob(job, preferences, searchTerms),
  }));

  const isGoodMatch = (item: { relevant: boolean; inArea: boolean }) =>
    item.relevant && item.inArea;

  const hiddenCount = evaluated.filter((item) => !isGoodMatch(item)).length;
  const pool = options.includeAll ? evaluated : evaluated.filter(isGoodMatch);

  const sorted = [...pool].sort((a, b) => {
    const rankA = isGoodMatch(a) ? 1 : 0;
    const rankB = isGoodMatch(b) ? 1 : 0;
    if (rankA !== rankB) return rankB - rankA;
    return b.score - a.score;
  });

  return {
    jobs: sorted.map((item) => ({ ...item.job, matchScore: item.score })),
    hiddenCount,
  };
}
