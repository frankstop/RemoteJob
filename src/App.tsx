import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Ban,
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  ExternalLink,
  FileUp,
  Search,
  Settings,
  ShoppingBasket,
  Star,
} from "lucide-react";
import { applyFilters, salaryLabel, scoreJob, statusFor } from "./lib/jobs";
import { roleFamilies } from "./lib/roleFamilies";
import { defaultState, downloadState, loadUserState, saveUserState, statusPatch } from "./lib/storage";
import type { Dataset, Filters, Job, JobStatus, UserState } from "./lib/types";
import { seedDataset } from "./data/seedJobs";

const statusOptions: JobStatus[] = ["seen", "saved", "skipped", "applied", "interviewing", "rejected", "offer"];
const statusLabels: Record<JobStatus, string> = {
  new: "New",
  seen: "Seen",
  saved: "Saved",
  skipped: "Skipped",
  applied: "Applied",
  interviewing: "Interviewing",
  rejected: "Rejected",
  offer: "Offer",
};

const emptyFilters: Filters = {
  query: "",
  family: "All",
  source: "All",
  status: "All",
  remoteScope: "All",
  maxAgeDays: 30,
  minSalary: 0,
};

export function App() {
  const [dataset, setDataset] = useState<Dataset>(seedDataset);
  const [state, setState] = useState<UserState>(defaultState);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [selectedId, setSelectedId] = useState(seedDataset.jobs[0]?.id ?? "");
  const [panel, setPanel] = useState<"details" | "settings" | "sources">("details");

  useEffect(() => {
    const stored = loadUserState();
    setState(stored);
    setFilters((current) => ({ ...current, query: stored.prefs.query, minSalary: stored.prefs.minSalary }));
    fetch(`${import.meta.env.BASE_URL}data/jobs.json`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : seedDataset))
      .then((next: Dataset) => {
        const valid = Array.isArray(next.jobs) && next.jobs.length > 0;
        setDataset(valid ? next : seedDataset);
        setSelectedId((valid ? next.jobs[0]?.id : seedDataset.jobs[0]?.id) ?? "");
      })
      .catch(() => setDataset(seedDataset));
  }, []);

  useEffect(() => {
    saveUserState(state);
  }, [state]);

  const sources = useMemo(() => Array.from(new Set(dataset.jobs.map((job) => job.source))).sort(), [dataset.jobs]);
  const visibleJobs = useMemo(() => applyFilters(dataset.jobs, filters, state), [dataset.jobs, filters, state]);
  const selectedJob = dataset.jobs.find((job) => job.id === selectedId) ?? visibleJobs[0] ?? dataset.jobs[0];
  const cartJobs = dataset.jobs.filter((job) => state.applyCart.includes(job.id));
  const savedCount = Object.values(state.jobs).filter((job) => job.status === "saved").length;
  const appliedCount = Object.values(state.jobs).filter((job) => job.status === "applied").length;
  const blockedCount = Object.values(state.companies).filter((company) => company.blocked).length;

  function updateState(updater: (current: UserState) => UserState) {
    setState((current) => updater(structuredClone(current)));
  }

  function setJobStatus(job: Job, status: JobStatus) {
    updateState((current) => {
      const existing = current.jobs[job.id];
      const fallback = {
        status: existing?.status ?? status,
        tags: existing?.tags ?? [],
        notes: existing?.notes ?? "",
        resumeVersion: existing?.resumeVersion ?? "",
      };
      current.jobs[job.id] = { ...fallback, ...existing, ...statusPatch(status) };
      return current;
    });
  }

  function toggleCart(job: Job) {
    updateState((current) => {
      current.applyCart = current.applyCart.includes(job.id)
        ? current.applyCart.filter((id) => id !== job.id)
        : [...current.applyCart, job.id];
      return current;
    });
  }

  function updateJobNote(job: Job, patch: Partial<UserState["jobs"][string]>) {
    updateState((current) => {
      const existing = current.jobs[job.id];
      const fallback = {
        status: existing?.status ?? "seen",
        tags: existing?.tags ?? [],
        notes: existing?.notes ?? "",
        resumeVersion: existing?.resumeVersion ?? "",
      };
      current.jobs[job.id] = { ...fallback, ...existing, ...patch };
      return current;
    });
  }

  function updateCompany(job: Job, patch: Partial<UserState["companies"][string]>) {
    updateState((current) => {
      const existing = current.companies[job.company];
      const fallback = {
        blocked: existing?.blocked ?? false,
        notes: existing?.notes ?? "",
      };
      current.companies[job.company] = { ...fallback, ...existing, ...patch };
      return current;
    });
  }

  function importState(file: File | undefined) {
    if (!file) return;
    file.text()
      .then((text) => JSON.parse(text) as UserState)
      .then((next) => setState({ ...defaultState, ...next }))
      .catch(() => alert("Import failed. Use a RemoteJob state JSON file."));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="RemoteJob home">
          <span className="brand-mark">RJ</span>
          <div>
            <strong>RemoteJob</strong>
            <span>Static remote-work tracker</span>
          </div>
        </div>
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            placeholder="Search title, company, tools, tags"
          />
        </label>
        <div className="topbar-meta">
          <span>Updated {new Date(dataset.generatedAt).toLocaleString()}</span>
          <button className="cart-button" type="button" onClick={() => setPanel("settings")}>
            <ShoppingBasket size={18} aria-hidden="true" />
            Cart {state.applyCart.length}
          </button>
        </div>
      </header>

      <section className="summary-strip" aria-label="Remote job summary">
        <Metric label="Listings" value={dataset.jobs.length.toLocaleString()} />
        <Metric label="Visible" value={visibleJobs.length.toLocaleString()} />
        <Metric label="Saved" value={savedCount.toLocaleString()} />
        <Metric label="Applied" value={appliedCount.toLocaleString()} />
        <Metric label="Blocked" value={blockedCount.toLocaleString()} />
      </section>

      <div className="workspace">
        <aside className="filter-rail" aria-label="Filters">
          <div className="rail-heading">
            <BriefcaseBusiness size={18} aria-hidden="true" />
            <h2>Filters</h2>
          </div>
          <FilterSelect label="Role family" value={filters.family} values={["All", ...roleFamilies, "Other"]} onChange={(family) => setFilters({ ...filters, family })} />
          <FilterSelect label="Source" value={filters.source} values={["All", ...sources]} onChange={(source) => setFilters({ ...filters, source })} />
          <FilterSelect
            label="Remote scope"
            value={filters.remoteScope}
            values={["All", "global", "country", "region", "hybrid", "unknown"]}
            onChange={(remoteScope) => setFilters({ ...filters, remoteScope })}
          />
          <FilterSelect label="Status" value={filters.status} values={["All", "new", ...statusOptions]} onChange={(status) => setFilters({ ...filters, status })} />
          <label className="field">
            <span>Max age</span>
            <select value={filters.maxAgeDays} onChange={(event) => setFilters({ ...filters, maxAgeDays: Number(event.target.value) })}>
              <option value={0}>Any age</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </label>
          <label className="field">
            <span>Minimum salary</span>
            <input
              type="number"
              min={0}
              step={5000}
              value={filters.minSalary}
              onChange={(event) => setFilters({ ...filters, minSalary: Number(event.target.value) })}
            />
          </label>
          <div className="toggle-stack">
            <Toggle label="Hide seen" checked={state.prefs.hideSeen} onChange={(hideSeen) => updateState((current) => ({ ...current, prefs: { ...current.prefs, hideSeen } }))} />
            <Toggle label="Hide skipped" checked={state.prefs.hideSkipped} onChange={(hideSkipped) => updateState((current) => ({ ...current, prefs: { ...current.prefs, hideSkipped } }))} />
            <Toggle label="Hide blocked companies" checked={state.prefs.hideBlocked} onChange={(hideBlocked) => updateState((current) => ({ ...current, prefs: { ...current.prefs, hideBlocked } }))} />
          </div>
          <button type="button" className="secondary-button" onClick={() => setFilters(emptyFilters)}>
            Reset filters
          </button>
        </aside>

        <section className="job-list" aria-label="Job listings">
          <div className="list-heading">
            <div>
              <h1>Remote listings</h1>
              <p>Browse public feeds, track actions locally, export state anytime.</p>
            </div>
            <button className="secondary-button" type="button" onClick={() => setPanel("sources")}>
              <Archive size={16} aria-hidden="true" />
              Sources
            </button>
          </div>

          {visibleJobs.length === 0 ? (
            <div className="empty-state">
              <h2>No listings match.</h2>
              <p>Relax filters or import a refreshed dataset from the scheduled pipeline.</p>
            </div>
          ) : (
            <div className="list-stack">
              {visibleJobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  selected={selectedJob?.id === job.id}
                  status={statusFor(job, state)}
                  carted={state.applyCart.includes(job.id)}
                  score={scoreJob(job, filters.query, filters.minSalary)}
                  onSelect={() => {
                    setSelectedId(job.id);
                    setPanel("details");
                  }}
                  onStatus={(status) => setJobStatus(job, status)}
                  onCart={() => toggleCart(job)}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="detail-panel" aria-label="Job details">
          <div className="panel-tabs" role="tablist" aria-label="Panel tabs">
            <button className={panel === "details" ? "active" : ""} type="button" onClick={() => setPanel("details")}>Details</button>
            <button className={panel === "settings" ? "active" : ""} type="button" onClick={() => setPanel("settings")}>Cart & settings</button>
            <button className={panel === "sources" ? "active" : ""} type="button" onClick={() => setPanel("sources")}>Data</button>
          </div>

          {panel === "details" && selectedJob && (
            <JobDetails
              job={selectedJob}
              status={statusFor(selectedJob, state)}
              note={state.jobs[selectedJob.id]}
              company={state.companies[selectedJob.company]}
              carted={state.applyCart.includes(selectedJob.id)}
              onStatus={(status) => setJobStatus(selectedJob, status)}
              onCart={() => toggleCart(selectedJob)}
              onJobNote={(patch) => updateJobNote(selectedJob, patch)}
              onCompany={(patch) => updateCompany(selectedJob, patch)}
            />
          )}

          {panel === "settings" && (
            <SettingsPanel
              cartJobs={cartJobs}
              state={state}
              onStatus={(job, status) => setJobStatus(job, status)}
              onExport={() => downloadState(state)}
              onImport={importState}
              onPref={(prefs) => updateState((current) => ({ ...current, prefs: { ...current.prefs, ...prefs } }))}
            />
          )}

          {panel === "sources" && <SourcesPanel dataset={dataset} />}
        </aside>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FilterSelect({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {values.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function JobRow({
  job,
  selected,
  status,
  carted,
  score,
  onSelect,
  onStatus,
  onCart,
}: {
  job: Job;
  selected: boolean;
  status: JobStatus;
  carted: boolean;
  score: { score: number; reasons: string[] };
  onSelect: () => void;
  onStatus: (status: JobStatus) => void;
  onCart: () => void;
}) {
  return (
    <article className={`job-row ${selected ? "selected" : ""}`} onClick={onSelect}>
      <div className="job-main">
        <div className="job-title-line">
          <h2>{job.title}</h2>
          <span className={`status-chip status-${status}`}>{statusLabels[status]}</span>
        </div>
        <p>{job.company} · {job.roleFamily} · {salaryLabel(job)}</p>
        <div className="tag-row">
          <span>{job.remoteScope}</span>
          <span>{job.locationRestriction}</span>
          <span>{job.source}</span>
          {job.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </div>
      <div className="job-actions" onClick={(event) => event.stopPropagation()}>
        <div className="score-pill">{score.score}<span>fit</span></div>
        <button type="button" aria-label={`Save ${job.title}`} onClick={() => onStatus("saved")}>
          <Star size={16} aria-hidden="true" />
        </button>
        <button type="button" aria-label={`Skip ${job.title}`} onClick={() => onStatus("skipped")}>
          <Ban size={16} aria-hidden="true" />
        </button>
        <button type="button" aria-label={`Mark ${job.title} applied`} onClick={() => onStatus("applied")}>
          <CheckCircle2 size={16} aria-hidden="true" />
        </button>
        <button className={carted ? "active" : ""} type="button" aria-label={`Toggle ${job.title} in apply cart`} onClick={onCart}>
          <ShoppingBasket size={16} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function JobDetails({
  job,
  status,
  note,
  company,
  carted,
  onStatus,
  onCart,
  onJobNote,
  onCompany,
}: {
  job: Job;
  status: JobStatus;
  note: UserState["jobs"][string] | undefined;
  company: UserState["companies"][string] | undefined;
  carted: boolean;
  onStatus: (status: JobStatus) => void;
  onCart: () => void;
  onJobNote: (patch: Partial<UserState["jobs"][string]>) => void;
  onCompany: (patch: Partial<UserState["companies"][string]>) => void;
}) {
  return (
    <div className="panel-body">
      <div className="detail-heading">
        <span className={`status-chip status-${status}`}>{statusLabels[status]}</span>
        <h2>{job.title}</h2>
        <p>{job.company}</p>
      </div>
      <dl className="facts">
        <div><dt>Pay</dt><dd>{salaryLabel(job)}</dd></div>
        <div><dt>Remote</dt><dd>{job.remoteScope}, {job.locationRestriction}</dd></div>
        <div><dt>Source</dt><dd>{job.source}</dd></div>
        <div><dt>Posted</dt><dd>{job.postingDate ?? "Unknown"}</dd></div>
      </dl>
      <div className="button-grid">
        {statusOptions.map((option) => (
          <button key={option} className={status === option ? "active" : ""} type="button" onClick={() => onStatus(option)}>
            {statusLabels[option]}
          </button>
        ))}
      </div>
      <button className="primary-button" type="button" onClick={onCart}>
        <ShoppingBasket size={17} aria-hidden="true" />
        {carted ? "Remove from cart" : "Add to apply cart"}
      </button>
      <a className="apply-link" href={job.applyUrl} target="_blank" rel="noreferrer">
        Open application <ExternalLink size={16} aria-hidden="true" />
      </a>
      <label className="field">
        <span>Resume version</span>
        <input value={note?.resumeVersion ?? ""} onChange={(event) => onJobNote({ resumeVersion: event.target.value })} placeholder="Resume used for this job" />
      </label>
      <label className="field">
        <span>Job notes</span>
        <textarea value={note?.notes ?? ""} onChange={(event) => onJobNote({ notes: event.target.value })} placeholder="Fit notes, requirements, application details" />
      </label>
      <Toggle label="Block this company" checked={company?.blocked ?? false} onChange={(blocked) => onCompany({ blocked })} />
      <label className="field">
        <span>Company notes</span>
        <textarea value={company?.notes ?? ""} onChange={(event) => onCompany({ notes: event.target.value })} placeholder="Signals, concerns, recruiter notes" />
      </label>
    </div>
  );
}

function SettingsPanel({
  cartJobs,
  state,
  onStatus,
  onExport,
  onImport,
  onPref,
}: {
  cartJobs: Job[];
  state: UserState;
  onStatus: (job: Job, status: JobStatus) => void;
  onExport: () => void;
  onImport: (file: File | undefined) => void;
  onPref: (prefs: Partial<UserState["prefs"]>) => void;
}) {
  return (
    <div className="panel-body">
      <div className="detail-heading">
        <Settings size={18} aria-hidden="true" />
        <h2>Cart & settings</h2>
        <p>{cartJobs.length} jobs ready for batch application.</p>
      </div>
      <div className="cart-list">
        {cartJobs.length === 0 ? <p className="muted">Cart empty.</p> : cartJobs.map((job) => (
          <div className="cart-row" key={job.id}>
            <div>
              <strong>{job.title}</strong>
              <span>{job.company}</span>
            </div>
            <button type="button" onClick={() => onStatus(job, "applied")}>Applied</button>
          </div>
        ))}
      </div>
      <label className="field">
        <span>Default query</span>
        <input value={state.prefs.query} onChange={(event) => onPref({ query: event.target.value })} placeholder="support, design, sales" />
      </label>
      <label className="field">
        <span>Default minimum salary</span>
        <input type="number" value={state.prefs.minSalary} onChange={(event) => onPref({ minSalary: Number(event.target.value) })} />
      </label>
      <div className="utility-row">
        <button className="secondary-button" type="button" onClick={onExport}>
          <Download size={16} aria-hidden="true" />
          Export state
        </button>
        <label className="file-button">
          <FileUp size={16} aria-hidden="true" />
          Import state
          <input type="file" accept="application/json" onChange={(event) => onImport(event.target.files?.[0])} />
        </label>
      </div>
    </div>
  );
}

function SourcesPanel({ dataset }: { dataset: Dataset }) {
  return (
    <div className="panel-body">
      <div className="detail-heading">
        <Archive size={18} aria-hidden="true" />
        <h2>Public data pipeline</h2>
        <p>Scheduled GitHub Actions refresh static JSON. User tracking never leaves this browser.</p>
      </div>
      <dl className="facts">
        <div><dt>Generated</dt><dd>{new Date(dataset.generatedAt).toLocaleString()}</dd></div>
        <div><dt>Sources</dt><dd>{dataset.sources.join(", ")}</dd></div>
        <div><dt>Records</dt><dd>{dataset.jobs.length}</dd></div>
      </dl>
      <p className="source-note">Source policy lives in `config/source_policy.json`. Keep only permitted APIs and structured feeds.</p>
    </div>
  );
}
