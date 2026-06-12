import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const now = new Date().toISOString();
const policy = JSON.parse(await readFile(new URL("../config/source_policy.json", import.meta.url), "utf8"));

const families = [
  ["Software Engineering", ["engineer", "developer", "frontend", "backend", "full stack", "mobile", "ios", "android", "devops", "sre", "platform"]],
  ["Data & Analytics", ["data", "analytics", "analyst", "scientist", "bi", "machine learning", "ai", "ml"]],
  ["Product", ["product manager", "product owner", "program manager", "scrum"]],
  ["Design", ["designer", "ux", "ui", "researcher", "creative", "brand"]],
  ["Customer Support", ["support", "success", "customer", "help desk", "technical support"]],
  ["Sales", ["sales", "account executive", "business development", "revenue"]],
  ["Marketing", ["marketing", "content", "seo", "growth", "demand generation", "social media"]],
  ["Operations", ["operations", "ops", "coordinator", "administrator", "admin", "logistics"]],
  ["Finance", ["finance", "accounting", "bookkeeper", "controller", "payroll"]],
  ["People & Recruiting", ["recruiter", "talent", "people", "hr", "human resources"]],
  ["Legal & Compliance", ["legal", "counsel", "compliance", "privacy", "risk"]],
  ["Writing & Editorial", ["writer", "editor", "copywriter", "technical writer", "documentation"]],
  ["Education", ["teacher", "instructor", "tutor", "curriculum", "coach"]],
  ["Healthcare", ["nurse", "medical", "clinical", "therapist", "health"]],
  ["Project Management", ["project manager", "implementation manager", "delivery manager"]],
];

function cleanText(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function hashId(parts) {
  return createHash("sha256")
    .update(parts.map((part) => String(part ?? "").toLowerCase().trim()).join("|"))
    .digest("hex")
    .slice(0, 18);
}

function classifyRole(title, tags = [], description = "") {
  const haystack = `${title} ${tags.join(" ")} ${description}`.toLowerCase();
  const match = families.find(([, needles]) => needles.some((needle) => haystack.includes(needle)));
  return match?.[0] ?? "Other";
}

function remoteScope(location = "", remote = true) {
  const lower = String(location).toLowerCase();
  if (!remote && lower.includes("hybrid")) return "hybrid";
  if (lower.includes("worldwide") || lower.includes("global") || lower.includes("anywhere")) return "global";
  if (lower.includes("remote - us") || lower.includes("remote, us")) return "country";
  if (lower.includes("united states") || lower.includes("usa") || lower.includes("canada") || lower.includes("uk")) return "country";
  if (lower.includes("timezone") || lower.includes("emea") || lower.includes("americas") || lower.includes("europe")) return "region";
  return remote ? "unknown" : "hybrid";
}

function normalizeSalary(min, max, text = "") {
  const parsed = cleanText(text).match(/\$?\s?(\d{2,3})(?:[,kK ]?)(?:\s?[-–]\s?\$?\s?(\d{2,3})(?:[,kK ]?)?)?/);
  const salaryMin = Number(min) || (parsed ? Number(parsed[1]) * (Number(parsed[1]) < 1000 ? 1000 : 1) : null);
  const salaryMax = Number(max) || (parsed?.[2] ? Number(parsed[2]) * (Number(parsed[2]) < 1000 ? 1000 : 1) : null);
  return { salaryMin, salaryMax, currency: salaryMin || salaryMax ? "USD" : null };
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

async function fetchJson(source) {
  const response = await fetch(source.endpoint, {
    headers: {
      accept: "application/json",
      "user-agent": "RemoteJob employer ATS indexer (https://github.com/frankstop/RemoteJob)"
    }
  });
  if (!response.ok) throw new Error(`${source.name} ${response.status}`);
  return response.json();
}

function greenhouseLocation(item) {
  return cleanText(item.location?.name ?? item.location ?? "Remote") || "Remote";
}

function greenhouseTags(source, item) {
  return [
    source.category,
    ...(item.departments ?? []).map((department) => department?.name),
    ...(item.offices ?? []).map((office) => office?.name),
  ].filter(Boolean).map(cleanText);
}

function fromGreenhouse(source, payload) {
  return (payload.jobs ?? []).map((item) => {
    const title = cleanText(item.title);
    const company = cleanText(source.name);
    const description = cleanText(item.content);
    const tags = greenhouseTags(source, item);
    const location = greenhouseLocation(item);
    const salary = normalizeSalary(null, null, description);

    return {
      id: hashId([source.provider, source.slug, item.id]),
      sourceIds: [`greenhouse:${source.slug}:${item.id}`],
      title,
      company,
      roleFamily: classifyRole(title, tags, description),
      remoteScope: remoteScope(location),
      locationRestriction: location,
      ...salary,
      postingDate: normalizeDate(item.updated_at),
      firstSeenAt: now,
      lastSeenAt: now,
      source: source.name,
      tags,
      applyUrl: item.absolute_url,
      description,
    };
  });
}

function ashbyJobs(payload) {
  if (Array.isArray(payload.jobs)) return payload.jobs;
  if (Array.isArray(payload.jobPostings)) return payload.jobPostings;
  return [];
}

function fromAshby(source, payload) {
  return ashbyJobs(payload).map((item) => {
    const title = cleanText(item.title);
    const company = cleanText(source.name);
    const description = cleanText(item.descriptionPlain ?? item.descriptionHtml ?? item.description);
    const location = cleanText(item.locationName ?? item.location ?? "Remote") || "Remote";
    const tags = [source.category, item.department, item.team].filter(Boolean).map(cleanText);
    const salary = normalizeSalary(null, null, `${item.compensation ?? ""} ${description}`);
    const applyUrl = item.jobUrl ?? item.applyUrl ?? `https://jobs.ashbyhq.com/${source.slug}/${item.id}`;

    return {
      id: hashId([source.provider, source.slug, item.id, title]),
      sourceIds: [`ashby:${source.slug}:${item.id}`],
      title,
      company,
      roleFamily: classifyRole(title, tags, description),
      remoteScope: remoteScope(location),
      locationRestriction: location,
      ...salary,
      postingDate: normalizeDate(item.publishedAt ?? item.updatedAt ?? item.createdAt),
      firstSeenAt: now,
      lastSeenAt: now,
      source: source.name,
      tags,
      applyUrl,
      description,
    };
  });
}

function fromLever(source, payload) {
  const postings = Array.isArray(payload) ? payload : [];
  return postings.map((item) => {
    const title = cleanText(item.text);
    const company = cleanText(source.name);
    const description = cleanText(item.descriptionPlain ?? item.description);
    const location = cleanText(item.categories?.location ?? "Remote") || "Remote";
    const tags = [source.category, item.categories?.team, item.categories?.commitment].filter(Boolean).map(cleanText);
    const salary = normalizeSalary(null, null, description);

    return {
      id: hashId([source.provider, source.slug, item.id]),
      sourceIds: [`lever:${source.slug}:${item.id}`],
      title,
      company,
      roleFamily: classifyRole(title, tags, description),
      remoteScope: remoteScope(location),
      locationRestriction: location,
      ...salary,
      postingDate: normalizeDate(item.createdAt),
      firstSeenAt: now,
      lastSeenAt: now,
      source: source.name,
      tags,
      applyUrl: item.hostedUrl ?? item.applyUrl,
      description,
    };
  });
}

const normalizers = {
  greenhouse: fromGreenhouse,
  ashby: fromAshby,
  lever: fromLever,
};

const results = [];
const failures = [];
const enabledSources = policy.sources.filter((item) => item.enabled);

for (const source of enabledSources) {
  const normalize = normalizers[source.provider];
  if (!normalize) {
    failures.push({ source: source.name, error: `Unsupported provider: ${source.provider}` });
    continue;
  }

  try {
    const payload = await fetchJson(source);
    results.push(...normalize(source, payload));
  } catch (error) {
    failures.push({ source: source.name, error: error.message });
  }
}

const deduped = new Map();
for (const job of results) {
  const key = hashId([job.title.replace(/\b(remote|senior|sr|jr|junior)\b/gi, ""), job.company]);
  const existing = deduped.get(key);
  if (!existing) {
    deduped.set(key, job);
  } else {
    existing.sourceIds = Array.from(new Set([...existing.sourceIds, ...job.sourceIds]));
    existing.tags = Array.from(new Set([...existing.tags, ...job.tags])).slice(0, 12);
    existing.lastSeenAt = now;
    if (!existing.salaryMin && job.salaryMin) existing.salaryMin = job.salaryMin;
    if (!existing.salaryMax && job.salaryMax) existing.salaryMax = job.salaryMax;
  }
}

const jobs = Array.from(deduped.values())
  .filter((job) => job.title && job.company && job.applyUrl)
  .sort((a, b) => String(b.postingDate ?? "").localeCompare(String(a.postingDate ?? "")));

if (jobs.length === 0) {
  throw new Error(`No jobs fetched. Failures: ${JSON.stringify(failures)}`);
}

await writeFile(
  new URL("../public/data/jobs.json", import.meta.url),
  JSON.stringify(
    {
      generatedAt: now,
      sources: enabledSources.map((source) => source.name),
      failures,
      jobs,
    },
    null,
    2
  )
);

await writeFile(
  new URL("../public/data/sources.json", import.meta.url),
  JSON.stringify(
    {
      generatedAt: now,
      sources: policy.sources.map(({ name, category, provider, docs, endpoint, enabled, requiresKey, attribution }) => ({
        name,
        category,
        provider,
        docs,
        endpoint,
        enabled,
        requiresKey,
        attribution,
      })),
    },
    null,
    2
  )
);

console.log(`Wrote ${jobs.length} jobs from ${enabledSources.length} employer ATS sources`);
if (failures.length) console.warn(JSON.stringify(failures, null, 2));
