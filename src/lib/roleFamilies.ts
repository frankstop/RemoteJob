const familyRules: Array<[string, string[]]> = [
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

export const roleFamilies = familyRules.map(([family]) => family);

export function classifyRole(title: string, tags: string[] = [], description = "") {
  const haystack = `${title} ${tags.join(" ")} ${description}`.toLowerCase();
  const match = familyRules.find(([, needles]) => needles.some((needle) => haystack.includes(needle)));
  return match?.[0] ?? "Other";
}

