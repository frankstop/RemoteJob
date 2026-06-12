export type JobStatus =
  | "new"
  | "seen"
  | "saved"
  | "skipped"
  | "applied"
  | "interviewing"
  | "rejected"
  | "offer";

export type RemoteScope = "global" | "country" | "region" | "hybrid" | "unknown";

export type Job = {
  id: string;
  sourceIds: string[];
  title: string;
  company: string;
  roleFamily: string;
  remoteScope: RemoteScope;
  locationRestriction: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  postingDate: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  source: string;
  tags: string[];
  applyUrl: string;
  description: string;
};

export type Dataset = {
  generatedAt: string;
  sources: string[];
  jobs: Job[];
};

export type JobNote = {
  status: JobStatus;
  seenAt?: string;
  savedAt?: string;
  appliedAt?: string;
  tags: string[];
  notes: string;
  resumeVersion: string;
};

export type CompanyNote = {
  blocked: boolean;
  notes: string;
};

export type UserPrefs = {
  query: string;
  minSalary: number;
  hideSeen: boolean;
  hideSkipped: boolean;
  hideBlocked: boolean;
};

export type UserState = {
  jobs: Record<string, JobNote>;
  companies: Record<string, CompanyNote>;
  prefs: UserPrefs;
  applyCart: string[];
};

export type Filters = {
  query: string;
  family: string;
  source: string;
  status: string;
  remoteScope: string;
  maxAgeDays: number;
  minSalary: number;
};

