import type { Filters, Job, UserState } from "./types";

export function statusFor(job: Job, state: UserState) {
  return state.jobs[job.id]?.status ?? "new";
}

export function salaryLabel(job: Job) {
  if (!job.salaryMin && !job.salaryMax) return "Pay not listed";
  const currency = job.currency ?? "USD";
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
  if (job.salaryMin && job.salaryMax) return `${fmt.format(job.salaryMin)} to ${fmt.format(job.salaryMax)}`;
  if (job.salaryMin) return `${fmt.format(job.salaryMin)}+`;
  return `Up to ${fmt.format(job.salaryMax ?? 0)}`;
}

export function jobAgeDays(job: Job) {
  if (!job.postingDate) return 9999;
  const time = new Date(job.postingDate).getTime();
  if (Number.isNaN(time)) return 9999;
  return Math.max(0, Math.round((Date.now() - time) / 86400000));
}

export function scoreJob(job: Job, query: string, minSalary: number) {
  const reasons: string[] = [];
  let score = 50;
  const text = `${job.title} ${job.company} ${job.tags.join(" ")} ${job.description}`.toLowerCase();

  for (const part of query.toLowerCase().split(/\s+/).filter(Boolean)) {
    if (text.includes(part)) {
      score += 8;
      if (reasons.length < 3) reasons.push(`matches ${part}`);
    }
  }
  if (job.salaryMin || job.salaryMax) {
    score += 10;
    reasons.push("pay listed");
  }
  if ((job.salaryMax ?? job.salaryMin ?? 0) >= minSalary && minSalary > 0) {
    score += 10;
    reasons.push("meets pay floor");
  }
  if (job.remoteScope === "global") {
    score += 8;
    reasons.push("global remote");
  }
  if (jobAgeDays(job) <= 7) {
    score += 8;
    reasons.push("posted this week");
  }
  return { score: Math.min(99, score), reasons: reasons.slice(0, 4) };
}

export function applyFilters(jobs: Job[], filters: Filters, state: UserState) {
  const query = filters.query.trim().toLowerCase();
  return jobs
    .filter((job) => {
      const status = statusFor(job, state);
      const company = state.companies[job.company];
      const text = `${job.title} ${job.company} ${job.tags.join(" ")} ${job.description}`.toLowerCase();
      const salary = job.salaryMax ?? job.salaryMin ?? 0;

      if (query && !text.includes(query)) return false;
      if (filters.family !== "All" && job.roleFamily !== filters.family) return false;
      if (filters.source !== "All" && job.source !== filters.source) return false;
      if (filters.status !== "All" && status !== filters.status) return false;
      if (filters.remoteScope !== "All" && job.remoteScope !== filters.remoteScope) return false;
      if (filters.maxAgeDays > 0 && jobAgeDays(job) > filters.maxAgeDays) return false;
      if (filters.minSalary > 0 && salary > 0 && salary < filters.minSalary) return false;
      if (state.prefs.hideSeen && status === "seen") return false;
      if (state.prefs.hideSkipped && status === "skipped") return false;
      if (state.prefs.hideBlocked && company?.blocked) return false;
      return true;
    })
    .sort((a, b) => {
      const aScore = scoreJob(a, filters.query, filters.minSalary).score;
      const bScore = scoreJob(b, filters.query, filters.minSalary).score;
      return bScore - aScore || jobAgeDays(a) - jobAgeDays(b);
    });
}

