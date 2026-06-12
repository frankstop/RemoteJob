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
  if (lower.includes("timezone") || lower.includes("emea") || lower.includes("americas") || lower.includes("europe")) return "region";
  if (lower.includes("united states") || lower.includes("usa") || lower.includes("canada") || lower.includes("uk")) return "country";
  return remote ? "unknown" : "hybrid";
}

function normalizeSalary(min, max, text = "") {
  const parsed = cleanText(text).match(/\$?\s?(\d{2,3})(?:[,kK ]?)(?:\s?[-–]\s?\$?\s?(\d{2,3})(?:[,kK ]?)?)?/);
  const salaryMin = Number(min) || (parsed ? Number(parsed[1]) * (Number(parsed[1]) < 1000 ? 1000 : 1) : null);
  const salaryMax = Number(max) || (parsed?.[2] ? Number(parsed[2]) * (Number(parsed[2]) < 1000 ? 1000 : 1) : null);
  return { salaryMin, salaryMax, currency: salaryMin || salaryMax ? "USD" : null };
}

async function fetchJson(source) {
  const response = await fetch(source.endpoint, {
    headers: {
      "accept": "application/json",
      "user-agent": "RemoteJob static job indexer (https://github.com/frankstop/RemoteJob)"
    }
  });
  if (!response.ok) throw new Error(`${source.name} ${response.status}`);
  return response.json();
}

function fromRemotive(payload) {
  return (payload.jobs ?? []).map((item) => {
    const tags = [...(item.tags ?? []), item.category].filter(Boolean).map(cleanText);
    const salary = normalizeSalary(null, null, item.salary);
    const title = cleanText(item.title);
    const description = cleanText(item.description);
    const company = cleanText(item.company_name);
    return {
      id: hashId([title, company, item.url]),
      sourceIds: [`remotive:${item.id}`],
      title,
      company,
      roleFamily: classifyRole(title, tags, description),
      remoteScope: remoteScope(item.candidate_required_location),
      locationRestriction: cleanText(item.candidate_required_location) || "Remote",
      ...salary,
      postingDate: item.publication_date ? new Date(item.publication_date).toISOString().slice(0, 10) : null,
      firstSeenAt: now,
      lastSeenAt: now,
      source: "Remotive",
      tags,
      applyUrl: item.url,
      description,
    };
  });
}

function fromRemoteOk(payload) {
  return payload
    .filter((item) => item && item.position)
    .map((item) => {
      const tags = (item.tags ?? []).map(cleanText);
      const salary = normalizeSalary(item.salary_min, item.salary_max, "");
      const title = cleanText(item.position);
      const description = cleanText(item.description);
      const company = cleanText(item.company);
      return {
        id: hashId([title, company, item.url]),
        sourceIds: [`remoteok:${item.id}`],
        title,
        company,
        roleFamily: classifyRole(title, tags, description),
        remoteScope: remoteScope(item.location),
        locationRestriction: cleanText(item.location) || "Remote",
        ...salary,
        postingDate: item.date ? new Date(item.date).toISOString().slice(0, 10) : null,
        firstSeenAt: now,
        lastSeenAt: now,
        source: "Remote OK",
        tags,
        applyUrl: item.url,
        description,
      };
    });
}

function fromArbeitnow(payload) {
  return (payload.data ?? [])
    .filter((item) => item.remote)
    .map((item) => {
      const tags = (item.tags ?? []).map(cleanText);
      const title = cleanText(item.title);
      const description = cleanText(item.description);
      const company = cleanText(item.company_name);
      const date = item.created_at ? new Date(item.created_at * 1000).toISOString().slice(0, 10) : null;
      return {
        id: hashId([title, company, item.url]),
        sourceIds: [`arbeitnow:${item.slug}`],
        title,
        company,
        roleFamily: classifyRole(title, tags, description),
        remoteScope: remoteScope(item.location, item.remote),
        locationRestriction: cleanText(item.location) || "Remote",
        salaryMin: null,
        salaryMax: null,
        currency: null,
        postingDate: date,
        firstSeenAt: now,
        lastSeenAt: now,
        source: "Arbeitnow",
        tags,
        applyUrl: item.url,
        description,
      };
    });
}

const normalizers = {
  Remotive: fromRemotive,
  "Remote OK": fromRemoteOk,
  Arbeitnow: fromArbeitnow,
};

const results = [];
const failures = [];

for (const source of policy.sources.filter((item) => item.enabled)) {
  try {
    const payload = await fetchJson(source);
    results.push(...normalizers[source.name](payload));
  } catch (error) {
    failures.push({ source: source.name, error: error.message });
  }
}

const deduped = new Map();
for (const job of results) {
  const key = hashId([job.title.replace(/\b(remote|senior|jr|junior)\b/gi, ""), job.company]);
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
      sources: policy.sources.filter((source) => source.enabled).map((source) => source.name),
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
      sources: policy.sources.map(({ name, docs, endpoint, enabled, requiresKey, attribution }) => ({
        name,
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

console.log(`Wrote ${jobs.length} jobs from ${policy.sources.length} sources`);
if (failures.length) console.warn(JSON.stringify(failures, null, 2));

