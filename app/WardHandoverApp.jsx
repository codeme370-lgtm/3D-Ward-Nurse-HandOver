"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import WardAppFooter from "./WardAppFooter";
import WardClinicalIcon, { getWardConcernIconName, getWardFieldIconName } from "./WardClinicalIcon";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BedDouble,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Filter,
  HeartPulse,
  LockKeyhole,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  RotateCcw,
  Save,
  Printer,
  Search,
  Settings2,
  Database,
  Shield,
  ShieldCheck,
  Siren,
  Stethoscope,
  Users,
  X,
} from "lucide-react";

const nurseScreens = [
  { id: "cover", label: "Cover", icon: ClipboardList },
  { id: "briefing", label: "Briefing", icon: HeartPulse },
  { id: "specialist", label: "Surgical & Specialist", icon: Stethoscope },
  { id: "signoff", label: "Ward Values & Sign-off", icon: ClipboardCheck },
];

function CoverDateTime({ timeOnly = false }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const updateTime = () => setNow(new Date());
    updateTime();
    const intervalId = window.setInterval(updateTime, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  if (!now) return <span aria-live="off">Loading current time</span>;

  const time = now.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
  if (timeOnly) return <time dateTime={now.toISOString()}>{time}</time>;

  const date = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <span>
      Ward 3D · Start of shift briefing · <time dateTime={now.toISOString()}>{time}</time> · {date}
    </span>
  );
}

function PublicCoverPage() {
  return (
    <main className="wh-app wh-public-cover-page">
      <header className="wh-public-topbar">
        <Link className="wh-public-brand" href="/" aria-label="Barts Health Ward 3D home">
          <strong>Barts Health</strong>
          <small>NHS Trust · Ward 3D</small>
        </Link>
        <div className="wh-public-title">NIC Safety Briefing &amp; Handover</div>
      </header>
      <nav className="wh-public-tabs" aria-label="Handover sections">
        {nurseScreens.map(({ id, label }) => (
          <Link
            key={id}
            className={id === "cover" ? "active" : ""}
            href={id === "cover" ? "/" : "/sign-in"}
            aria-current={id === "cover" ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <section className="wh-public-cover">
        <div className="wh-public-cover-heading">
          <span>BARTS HEALTH NHS TRUST</span>
          <h1>3D NURSE IN CHARGE</h1>
          <h2>Safety Briefing &amp; Handover</h2>
          <p><CoverDateTime /></p>
        </div>
        <div className="wh-public-cover-image">
          <div className="wh-public-cover-actions">
            <Link className="wh-public-button primary" href="/sign-in">Start new handover</Link>
            <Link className="wh-public-button secondary" href="/sign-in">Open previous shift</Link>
          </div>
        </div>
        <footer className="wh-public-cover-footer">
          <span>Ward 3D · NIC Safety Briefing &amp; Handover · Contains patient information</span>
          <Link href="/sign-in">Start briefing <ArrowRight size={15} /></Link>
        </footer>
      </section>
    </main>
  );
}


const adminScreens = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "records", label: "Handover records", icon: FileText },
  { id: "users", label: "Users & roles", icon: Users },
  { id: "form-settings", label: "Form settings", icon: Settings2 },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "audit", label: "Audit log", icon: Search },
  { id: "retention", label: "Data & retention", icon: Database },
];

const managerScreens = adminScreens.filter(({ id }) => ["dashboard", "records", "users", "reports", "audit"].includes(id));
const administratorScreens = adminScreens.filter(({ id }) => ["users", "form-settings", "audit", "retention"].includes(id));
const allAccessScreens = [...adminScreens, ...nurseScreens];

const screenRoutes = {
  cover: "/handover/cover",
  briefing: "/handover/briefing",
  specialist: "/handover/surgical-specialist",
  signoff: "/handover/values-signoff",
  dashboard: "/admin/dashboard",
  records: "/admin/handover-records",
  users: "/admin/users-roles",
  "form-settings": "/admin/form-settings",
  reports: "/admin/reports",
  audit: "/admin/audit-log",
  retention: "/admin/data-retention",
};
const routeScreens = Object.fromEntries(Object.entries(screenRoutes).map(([screen, route]) => [route, screen]));

const concernTypes = [
  "DNAR",
  "Palliative Patient",
  "Fast Track",
  "Red Tray",
  "Falls Risk",
  "Confusion / Delirium",
  "Enhance Care",
  "Mental Health Pt",
  "Disability",
  "Learning Disability",
  "Care Giver",
  "Adolescent",
  "Forms Completed",
  "Guardian / Parent",
  "Pressure Damage",
  "Infection Control",
  "Safeguarding",
];

const signoffChecks = [
  { id: "newsPatientsDiscussed", label: "All unwell / deteriorating (NEWS) patients discussed" },
  { id: "dnarAndPalliativeConfirmed", label: "DNAR and palliative patients confirmed" },
  { id: "safeguardingHandedOver", label: "Safeguarding concerns handed over" },
  { id: "resusTrolleyChecked", label: "Resuscitation trolley checked and sealed" },
  { id: "controlledDrugsChecked", label: "Controlled drugs (CD & Schedule 3) checked" },
  { id: "ttasAndTransportNoted", label: "Outstanding TTAs and transport noted" },
];

const initialForm = {
  date: "",
  shift: "Early",
  nic: "",
  patients: "",
  emptyBeds: "",
  amber: "",
  discharge: "",
  staffing: "",
  news: "",
  concerns: {},
  concernNotes: {},
  equipmentUsed: "",
  equipmentChecked: "",
  equipmentNotes: "",
  appointments: "",
  externalAppointments: "",
  transport: "",
  escorts: "",
  mobility: "",
  mobilityDetails: { bedRest: "", levelDuration: "", concern: "" },
  surgicalDetails: { nbm: "", imaging: "", emergencyTheatre: "", tci: "" },
  labDetails: { preOpBlood: "", postOpBlood: "", generalBlood: "", bloodProduct: "", ivInfusion: "" },
  governanceDetails: { complaint: "", incidentReport: "", datixReference: "", idhPoc: "" },
  vascularDetails: { cvc: "", picc: "", note: "" },
  feedDetails: { ng: "", nj: "", rig: "", tpn: "", peg: "", jTube: "", note: "" },
  medicationDetails: { cdSchedule3: "", note: "" },
  tta: "",
  transportDetails: { hospitalTransport: "", reference: "" },
  specificInstructions: "",
  additional: "",
  flap: "",
  checksFrequency: "",
  clinicalConcerns: "",
  checks: {},
  outgoingSigner: "",
  incomingSigner: "",
  incomingEmail: "",
  incomingPassword: "",
  incomingNotes: "",
};

const initialFormConfig = {
  version: 1,
  concerns: concernTypes.map((label, index) => ({ id: `concern-${index + 1}`, label, enabled: true })),
  sections: ["Patient & Staffing Overview", "Unwell / Deteriorating (NEWS)", "Clinical & Safeguarding Concerns", "Equipment & Safety Checks", "Appointments / Transport", "Mobility / Surgical Instructions", "Pre & Post Surgery", "Labs & Infusion", "Governance & Safety", "Vascular Access", "External Feed", "Medications & Discharges", "TTA"].map((label, index) => ({ id: `section-${index + 1}`, label, enabled: true })),
  shifts: ["Early", "Late", "Night"],
  wards: ["3D"],
};

const initialRetentionSettings = {
  retentionYears: 8,
  autoLockMinutes: 2,
};

async function wardApi(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return {};
  const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
  if (!response.ok) throw new Error(data?.error || `Ward 3D request failed (${response.status}).`);
  return data || {};
}

function getLocalDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayStatus(status) {
  return ({ SIGNED_OFF: "Signed off", IN_PROGRESS: "In progress", NOT_SIGNED_OFF: "Not signed off", ACTIVE: "Active", DISABLED: "Disabled", PENDING: "Pending" })[status] || status;
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString("en-GB") : "—";
}

function shortName(value) {
  const name = String(value || "").trim();
  const parts = name.split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]}. ${parts[parts.length - 1]}` : name || "—";
}

function dashboardFlagAction(detail) {
  return String(detail || "")
    .replace(/^\s*bed\s*#?\s*[a-z0-9-]+\s*[·:-]?\s*/i, "")
    .replace(/\bNEWS\s*\d+\s*[·:-]?\s*/i, "")
    .trim() || "Review handover";
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function formatHandover(record) {
  const concerns = record.payload?.concerns || {};
  const countEnabled = (name) => {
    const value = concerns[name];
    return value === true || value?.enabled === true;
  };
  const newsCount = typeof record.payload?.news === "string"
    ? record.payload.news.split(/\r?\n/).filter((line) => line.trim()).length
    : 0;
  return {
    ...record,
    date: record.handoverDate ? new Date(record.handoverDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "",
    nic: record.nurseInChargeName || "",
    signedOffBy: record.outgoingNicName || "—",
    rawStatus: record.status,
    status: displayStatus(record.status),
    dnarFlags: Object.keys(concerns).filter((key) => /dnar/i.test(key) && countEnabled(key)).length,
    newsFlags: newsCount,
    flags: Object.keys(concerns).filter((key) => countEnabled(key)).length + newsCount,
  };
}

function getHandoverDetailRows(payload) {
  const rows = [];
  const labels = {
    equipmentUsed: "Resuscitation trolley used",
    equipmentChecked: "Trolley checked and sealed",
    equipmentNotes: "Equipment issue / location",
    appointments: "Internal appointment",
    externalAppointments: "External appointment",
    transport: "Transport",
    escorts: "Escorts",
    tta: "TTAs outstanding",
    additional: "Additional handover notes",
    incomingNotes: "Notes for incoming NIC",
  };
  const checkLabels = {
    newsPatientsDiscussed: "NEWS patients discussed",
    dnarAndPalliativeConfirmed: "DNAR and palliative patients confirmed",
    safeguardingHandedOver: "Safeguarding concerns handed over",
    resusTrolleyChecked: "Resuscitation trolley checked and sealed",
    controlledDrugsChecked: "Controlled drugs checked",
    ttasAndTransportNoted: "Outstanding TTAs and transport noted",
  };
  const excluded = new Set([
    "checks", "formConfigSnapshot", "concernNotes", "incomingEmail", "incomingPassword",
    "outgoingSigner", "incomingSigner", "signedOffAt", "date", "shift", "nic",
  ]);
  const humanize = (key) => labels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
  const visit = (value, label) => {
    if (value == null || value === "") return;
    if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
      if (typeof value === "string" && !value.trim()) return;
      rows.push({ label, value: typeof value === "boolean" ? (value ? "Yes" : "No") : String(value) });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${label} ${index + 1}`));
      return;
    }
    if (typeof value !== "object") return;
    Object.entries(value).forEach(([key, item]) => {
      if (key === "concerns") {
        Object.entries(item || {}).forEach(([concern, entry]) => {
          if (entry !== true && entry?.enabled !== true) return;
          const note = typeof entry === "object" && entry ? entry.note || entry.action : "";
          rows.push({ label: `Concern · ${concern}`, value: note || "Flagged" });
        });
        return;
      }
      if (key === "checks") {
        Object.entries(checkLabels).forEach(([check, checkLabel]) => {
          rows.push({ label: checkLabel, value: item?.[check] === true ? "Complete" : "Not complete" });
        });
        return;
      }
      if (excluded.has(key)) return;
      visit(item, label ? `${label} · ${humanize(key)}` : humanize(key));
    });
  };
  visit(payload, "");
  return rows;
}

function getPageNumbers(total, current) {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 3) return [1, 2, 3, "ellipsis", total];
  if (current >= total - 2) return [1, "ellipsis", total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

function PageTitle({ eyebrow, title, description, action }) {
  return (
    <div className="wh-page-title">
      <div>
        {eyebrow && <p className="wh-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="wh-page-description">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function MetricCard({ label, value, note, icon: Icon, tone = "blue" }) {
  return (
    <article className={`wh-metric-card tone-${tone}`}>
      <div className="wh-metric-top">
        <span>{label}</span>
        <span className="wh-metric-icon"><Icon size={18} /></span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function StatusBadge({ children }) {
  const tone = children === "Signed off" || children === "Active" ? "success" : children === "Pending" ? "warning" : "neutral";
  return <span className={`wh-status ${tone}`}><span />{children}</span>;
}

function Field({ label, value, onChange, disabled, type = "text", placeholder, min, max, icon }) {
  return (
    <label className="wh-field">
      <span className="wh-clinical-field-label">
        {icon && <WardClinicalIcon name={icon} size={16} />}
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        min={min}
        max={max}
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange, disabled, placeholder, rows = 3, icon }) {
  return (
    <label className="wh-field">
      <span className="wh-clinical-field-label">
        {icon && <WardClinicalIcon name={icon} size={16} />}
        {label}
      </span>
      <textarea rows={rows} value={value} onChange={onChange} disabled={disabled} placeholder={placeholder} />
    </label>
  );
}

function StructuredPanel({ title, caption, icon: Icon, fields, values = {}, disabled, onChange, tone = "blue", className = "", hidden = false }) {
  return (
    <article className={`wh-panel wh-reference-panel ${className}`} hidden={hidden}>
      <div className="wh-panel-heading"><span className={`wh-heading-icon ${tone}`}>{typeof Icon === "string" ? <WardClinicalIcon name={Icon} size={18} /> : <Icon size={18} />}</span><div><h2>{title}</h2><p>{caption}</p></div></div>
      <div className="wh-structured-fields">
        {fields.map((field) => (
          <div className="wh-structured-field" key={field.key}>
            <span className="wh-clinical-field-label"><WardClinicalIcon name={field.icon || getWardFieldIconName(field.key)} size={16} />{field.label}</span>
            {field.multiple ? (
              <span className="wh-inline-checks">
                {field.options.map((option) => {
                  const selected = (values[field.key] || "").split(", ").includes(option);
                  return (
                    <label key={option}>
                      <input
                        type="checkbox"
                        aria-label={`${field.label}: ${option}`}
                        checked={selected}
                        onChange={(event) => {
                          const next = new Set((values[field.key] || "").split(", ").filter(Boolean));
                          if (event.target.checked) next.add(option);
                          else next.delete(option);
                          onChange(field.key, [...next].join(", "));
                        }}
                        disabled={disabled}
                      />
                      {option}
                    </label>
                  );
                })}
              </span>
            ) : field.options ? (
              <select aria-label={field.label} value={values[field.key] || ""} onChange={(event) => onChange(field.key, event.target.value)} disabled={disabled}>
                <option value="">Select</option>
                {field.options.map((option) => <option key={option}>{option}</option>)}
              </select>
            ) : (
              <input aria-label={field.label} value={values[field.key] || ""} onChange={(event) => onChange(field.key, event.target.value)} disabled={disabled} placeholder={field.placeholder || "Enter details"} />
            )}
          </div>
        ))}
      </div>
    </article>
  );
}

function StructuredFields({ fields, values = {}, disabled, onChange }) {
  return (
    <div className="wh-structured-fields">
      {fields.map((field) => (
        <label className="wh-structured-field" key={field.key}>
          <span className="wh-clinical-field-label"><WardClinicalIcon name={field.icon || getWardFieldIconName(field.key)} size={16} />{field.label}</span>
          <input value={values[field.key] || ""} onChange={(event) => onChange(field.key, event.target.value)} disabled={disabled} placeholder={field.placeholder || "Enter details"} />
        </label>
      ))}
    </div>
  );
}

export default function WardHandoverApp() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, signOut } = useAuth();
  const role = user?.wardRole || "";
  const [screen, setScreenState] = useState(() => routeScreens[pathname] || "cover");
  const [form, setForm] = useState(initialForm);
  const [activeRecord, setActiveRecord] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordFiltersDraft, setRecordFiltersDraft] = useState({ search: "", shift: "All", status: "All", from: "", to: "" });
  const [recordFilters, setRecordFilters] = useState({ search: "", shift: "All", status: "All", from: "", to: "" });
  const [recordPagination, setRecordPagination] = useState({ page: 1, pageSize: 15, total: 0, pages: 0 });
  const [currentRecordPage, setCurrentRecordPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState("All");
  const [newUserDialogOpen, setNewUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", staffNumber: "", role: "NIC", password: "" });
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserRole, setEditingUserRole] = useState("NIC");
  const [accessRequests, setAccessRequests] = useState([]);
  const [accessRoleOverrides, setAccessRoleOverrides] = useState({});
  const [audit, setAudit] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [report, setReport] = useState(null);
  const [reportShift, setReportShift] = useState("All");
  const [reportSection, setReportSection] = useState("All");
  const [formConfig, setFormConfig] = useState(initialFormConfig);
  const [publishedFormConfig, setPublishedFormConfig] = useState(initialFormConfig);
  const [formConfigHistory, setFormConfigHistory] = useState([]);
  const [hasFormDraft, setHasFormDraft] = useState(false);
  const [retentionSettings, setRetentionSettings] = useState(initialRetentionSettings);
  const [retentionSummary, setRetentionSummary] = useState(null);
  const [auditFiltersDraft, setAuditFiltersDraft] = useState({ search: "", action: "All", user: "All", days: 7 });
  const [auditFilters, setAuditFilters] = useState({ search: "", action: "All", user: "All", days: 7 });
  const [auditPagination, setAuditPagination] = useState({ page: 1, pageSize: 15, total: 0, pages: 0 });
  const [auditPage, setAuditPage] = useState(1);
  const [auditUsers, setAuditUsers] = useState([]);
  const [auditActions, setAuditActions] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [search, setSearch] = useState("");
  const [reportDays, setReportDays] = useState(30);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState(false);
  const [signoffDialogOpen, setSignoffDialogOpen] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const autoSaveTimer = useRef(null);
  const autoSaveQueue = useRef(Promise.resolve());

  const isAdmin = role === "Ward manager" || role === "Admin" || role === "IG auditor" || role === "All access";
  const activeScreens = role === "All access" ? allAccessScreens : role === "Ward manager" ? managerScreens : role === "Admin" ? administratorScreens : role === "IG auditor" ? adminScreens.filter(({ id }) => id === "audit") : nurseScreens;
  const adminWorkspace = isAdmin && activeScreens.some(({ id }) => id === screen);
  const isLocked = activeRecord?.status === "SIGNED_OFF";
  const activeHandoverFormConfig = activeRecord?.payload?.formConfigSnapshot || formConfig;
  const pendingCount = accessRequests.length;
  const filteredRecords = records;
  const filteredUsers = useMemo(() => users.filter((item) => {
    const matchesText = `${item.name} ${item.email} ${item.role}`.toLowerCase().includes(search.toLowerCase());
    return matchesText && (userRoleFilter === "All" || item.role === userRoleFilter);
  }), [users, search, userRoleFilter]);
  const filteredAudit = audit;

  function setScreen(nextScreen) {
    setScreenState(nextScreen);
    const route = screenRoutes[nextScreen];
    if (route && pathname !== route) router.push(route, { scroll: false });
  }

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  async function loadUsers() {
    const [userData, accessData] = await Promise.all([
      wardApi("/api/ward/users"),
      wardApi("/api/ward/access-requests"),
    ]);
    setUsers(userData.users || []);
    setAccessRequests(accessData.requests || []);
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateNestedForm(section, key, value) {
    setForm((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
  }

  function queueHandoverSave(recordId, payload) {
    const save = autoSaveQueue.current.catch(() => {}).then(() => wardApi(`/api/ward/handovers/${recordId}`, {
      method: "PATCH",
      body: JSON.stringify({ payload }),
    }));
    autoSaveQueue.current = save;
    return save;
  }

  function isFormSectionEnabled(label) {
    return (activeHandoverFormConfig.sections || formConfig.sections).find((section) => section.label === label)?.enabled !== false;
  }

  async function recordExport(details) {
    await wardApi("/api/ward/audit", {
      method: "POST",
      body: JSON.stringify({ action: "Exported", details }),
    });
  }

  async function changeUser(userId, action, roleValue) {
    try {
      await wardApi("/api/ward/users", {
        method: "PATCH",
        body: JSON.stringify({ id: userId, action, ...(roleValue ? { role: roleValue } : {}) }),
      });
      await loadUsers();
      if (action === "role") setEditingUserId(null);
      notify(action === "role" ? "User role updated and audit logged." : `User ${action}d and audit logged.`);
    } catch (error) {
      notify(error.message);
    }
  }

  async function publishFormConfiguration() {
    try {
      const data = await wardApi("/api/ward/form-config", {
        method: "PATCH",
        body: JSON.stringify({ form: formConfig }),
      });
      setFormConfig(data.form);
      setPublishedFormConfig(data.form);
      setHasFormDraft(false);
      const current = await wardApi("/api/ward/form-config");
      setFormConfigHistory(current.history || []);
      notify(`Form configuration v${data.version} published and audit logged.`);
    } catch (error) {
      notify(error.message);
    }
  }

  async function saveFormDraft() {
    try {
      await wardApi("/api/ward/form-config", {
        method: "PATCH",
        body: JSON.stringify({ form: formConfig, draft: true }),
      });
      setHasFormDraft(true);
      notify("Form draft saved.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function discardFormDraft() {
    try {
      await wardApi("/api/ward/form-config", {
        method: "PATCH",
        body: JSON.stringify({ discardDraft: true }),
      });
      setFormConfig(publishedFormConfig);
      setHasFormDraft(false);
      notify("Saved draft discarded.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function createWardUser(event) {
    event.preventDefault();
    try {
      setSavingUser(true);
      await wardApi("/api/ward/users", {
        method: "POST",
        body: JSON.stringify(newUser),
      });
      setNewUser({ name: "", email: "", staffNumber: "", role: "NIC", password: "" });
      setNewUserDialogOpen(false);
      await loadUsers();
      notify("User created and audit logged.");
    } catch (error) {
      notify(error.message);
    } finally {
      setSavingUser(false);
    }
  }

  async function saveRetentionSettings() {
    try {
      const data = await wardApi("/api/ward/settings", {
        method: "PATCH",
        body: JSON.stringify({ settings: retentionSettings }),
      });
      setRetentionSettings({ ...initialRetentionSettings, ...data.settings });
      const summary = await wardApi("/api/ward/settings");
      setRetentionSummary(summary);
      notify("Retention settings saved and audit logged.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function downloadRecordList() {
    try {
      const params = new URLSearchParams({ limit: "250" });
      Object.entries(recordFilters).forEach(([key, value]) => {
        if (value && value !== "All") params.set(key, value);
      });
      const data = await wardApi(`/api/ward/handovers?${params.toString()}`);
      if (data.pagination.total > data.records.length) {
        throw new Error("More than 250 records match. Add filters before exporting the list.");
      }
      const exportRows = (data.records || []).map(formatHandover);
      const rows = [
        ["Date", "Shift", "Nurse in charge", "Status", "DNAR flags", "NEWS flags"],
        ...exportRows.map((record) => [record.date, record.shift, record.nic, record.status, record.dnarFlags, record.newsFlags]),
      ];
      const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
      await recordExport({ export: "Handover record list", records: exportRows.length, patientIdentifiersExcluded: true, staffNamesIncluded: true });
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "ward-3d-handover-records.csv";
      link.click();
      URL.revokeObjectURL(url);
      notify("Handover list exported and audit logged.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function downloadAuditLog() {
    try {
      const response = await fetch("/api/ward/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ export: true, ...auditFilters, filterAction: auditFilters.action }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Unable to export the audit log.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "ward-3d-audit-log.csv";
      link.click();
      URL.revokeObjectURL(url);
      notify("Audit log exported and audit logged.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function startHandover() {
    if (role !== "NIC" && role !== "All access") {
      notify("Only an authorised Nurse in Charge can start a handover.");
      return;
    }
    if (activeRecord?.status === "IN_PROGRESS") {
      setScreen("briefing");
      notify("Resuming your in-progress handover.");
      return;
    }
    try {
      const date = getLocalDate();
      const data = await wardApi("/api/ward/handovers", {
        method: "POST",
        body: JSON.stringify({ date, shift: form.shift, payload: { ...initialForm, date, shift: form.shift, nic: user.name } }),
      });
      setActiveRecord(data.record);
      setForm({ ...initialForm, ...data.record.payload, date, shift: data.record.shift, nic: user.name });
      setScreen("briefing");
      notify("New handover started. Changes save as you go.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function finishHandover() {
    if (!activeRecord?.id) {
      notify("Start or open a handover before signing off.");
      return;
    }
    const allChecksDone = signoffChecks.every(({ id }) => form.checks[id] === true);
    if (!allChecksDone || !form.incomingEmail || !form.incomingPassword) {
      notify("Complete all six safety checks and enter the incoming NIC's own sign-in details.");
      return;
    }
    try {
      setSaving(true);
      window.clearTimeout(autoSaveTimer.current);
      const { incomingEmail, incomingPassword, ...savedPayload } = form;
      await autoSaveQueue.current.catch(() => {});
      await queueHandoverSave(activeRecord.id, savedPayload);
      const data = await wardApi(`/api/ward/handovers/${activeRecord.id}`, {
        method: "POST",
        body: JSON.stringify({ incomingEmail, incomingPassword }),
      });
      setSignoffDialogOpen(false);
      setForm((current) => ({ ...current, incomingEmail: "", incomingPassword: "", incomingSigner: data.record.incomingNicName || current.incomingSigner }));
      setActiveRecord((current) => ({ ...current, ...data.record }));
      notify(data.message);
    } catch (error) {
      notify(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadCurrentHandover() {
    if (!user || !["NIC", "Ward staff", "All access"].includes(role)) return;
    const date = getLocalDate();
    const shift = form.shift || "Early";
    const data = await wardApi(`/api/ward/handovers?date=${date}&shift=${encodeURIComponent(shift)}&limit=1`);
    const record = data.records?.[0] || null;
    setActiveRecord(record);
    if (record) {
      setForm({ ...initialForm, ...record.payload, date, shift: record.shift, nic: record.payload?.nic || record.nurseInChargeName || user.name });
    } else {
      setForm((current) => ({ ...current, date, nic: user.name }));
    }
  }

  async function decideAccessRequest(accessRequest, decision) {
    const reason = decision === "DECLINE" ? window.prompt("Reason for declining this request:") || "" : "";
    if (decision === "DECLINE" && !reason.trim()) return;
    const grantedRole = accessRoleOverrides[accessRequest.id] || accessRequest.requestedRole;
    try {
      await wardApi(`/api/ward/access-requests/${accessRequest.id}`, {
        method: "PATCH",
        body: JSON.stringify({ decision, reason, ...(decision === "APPROVE" ? { grantedRole } : {}) }),
      });
      setAccessRoleOverrides((current) => {
        const next = { ...current };
        delete next[accessRequest.id];
        return next;
      });
      if (role === "Admin" || role === "All access") await loadUsers();
      else setAccessRequests((current) => current.filter((item) => item.id !== accessRequest.id));
      notify(decision === "APPROVE" ? "Access request approved and audit logged." : "Access request declined and audit logged.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function refreshDashboard() {
    try {
      setLoadingScreen(true);
      const [data, requestData] = await Promise.all([
        wardApi("/api/ward/dashboard"),
        wardApi("/api/ward/access-requests"),
      ]);
      setDashboard(data);
      setAccessRequests(requestData.requests || []);
    } catch (error) {
      notify(error.message);
    } finally {
      setLoadingScreen(false);
    }
  }

  async function downloadHandoverPdf(record) {
    if (!record?.id) {
      notify("Open a signed handover before downloading its PDF.");
      return;
    }
    try {
      const response = await fetch(`/api/ward/handovers/${record.id}/pdf`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Unable to download the handover PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ward-3d-handover-${new Date(record.handoverDate).toISOString().slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      notify(error.message);
    }
  }

  function getCurrentReportFilters() {
    return { days: reportDays, shift: reportShift, section: reportSection };
  }

  async function exportReportExcel() {
    try {
      const response = await fetch("/api/ward/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getCurrentReportFilters()),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Unable to export the aggregate report.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ward-3d-report-${reportDays}-days.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      notify(error.message);
    }
  }

  async function exportReportPdf() {
    if (!report) {
      notify("Wait for the report data to load before exporting.");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      notify("Allow pop-ups to print this aggregate report as a PDF.");
      return;
    }
    try {
      await recordExport({
        export: "Aggregate ward report PDF",
        days: report.periodDays,
        shift: report.shift,
        section: report.section,
        records: report.summary.totalHandovers,
        identifiersExcluded: true,
      });
    } catch (error) {
      printWindow.close();
      notify(error.message);
      return;
    }
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
    const concerns = report.concernCounts.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${item.count}</td></tr>`).join("");
    const incidents = report.incidentCategories.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${item.count}</td></tr>`).join("");
    const weeks = report.weeklyCompletion.map((week) => `<tr><td>${escapeHtml(week.week)}</td><td>${week.completed}</td><td>${week.total}</td></tr>`).join("");
    printWindow.document.write(`<!doctype html><html><head><title>Ward 3D aggregate report</title><style>body{font:12px Arial,sans-serif;color:#172443;margin:32px}h1{color:#2447a6}h2{margin-top:24px;color:#2447a6}p{color:#536687}.metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.metrics div{border:1px solid #dce3ee;padding:12px}.metrics strong{display:block;font-size:23px;margin-top:8px}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #dce3ee;padding:8px}th{color:#2447a6}footer{margin-top:24px;color:#687895;font-size:10px}</style></head><body><h1>Ward 3D · Reports</h1><p>Aggregate trends · Last ${report.periodDays} days · Shift: ${escapeHtml(report.shift)} · Section: ${escapeHtml(report.section)}</p><div class="metrics"><div>Completion rate<strong>${report.summary.completionRate}%</strong>${report.summary.signedOff} of ${report.summary.totalHandovers} signed off</div><div>Incidents (Datix)<strong>${report.summary.incidents}</strong></div><div>Complaints<strong>${report.summary.complaints}</strong></div><div>Average patients / shift<strong>${report.summary.averagePatientsPerShift}</strong></div><div>Occupancy<strong>${report.summary.occupancyRate}%</strong></div></div><h2>Most frequent concerns</h2><table><thead><tr><th>Concern</th><th>Count</th></tr></thead><tbody>${concerns || "<tr><td colspan='2'>No concerns recorded.</td></tr>"}</tbody></table><h2>Incidents by category</h2><table><thead><tr><th>Category</th><th>Count</th></tr></thead><tbody>${incidents || "<tr><td colspan='2'>No incidents recorded.</td></tr>"}</tbody></table><h2>Handover completion by week</h2><table><thead><tr><th>Week starting</th><th>Signed off</th><th>Total</th></tr></thead><tbody>${weeks || "<tr><td colspan='3'>No handovers recorded.</td></tr>"}</tbody></table><footer>Aggregated information only. No patient-level details are included.</footer><script>window.onload=()=>window.print()</script></body></html>`);
    printWindow.document.close();
  }

  async function signOutUser() {
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (error) {
      notify(error.message || "Unable to sign out.");
    }
  }

  async function openRecord(record) {
    try {
      const data = await wardApi(`/api/ward/handovers?id=${record.id}`);
      setSelectedRecord(data.record);
    } catch (error) {
      notify(error.message);
    }
  }

  const canEditForm = (role === "NIC" || role === "All access") && Boolean(activeRecord) && (role === "All access" || activeRecord.nurseInChargeId === user?.id) && !isLocked;

  useEffect(() => {
    if (authLoading || !user) return;
    if (role === "Super admin") {
      if (pathname !== "/super-admin") router.replace("/super-admin");
      return;
    }
    const routeScreen = routeScreens[pathname];
    if (routeScreen) {
      setScreenState(routeScreen);
      return;
    }
    setScreen(role === "Ward manager" || role === "All access" ? "dashboard" : role === "Admin" ? "users" : role === "IG auditor" ? "audit" : "cover");
  }, [authLoading, user?.id, pathname, role, router]);

  useEffect(() => {
    if (authLoading || !user) return;
    const routeScreen = routeScreens[pathname];
    if (!routeScreen || activeScreens.some(({ id }) => id === routeScreen)) return;
    const defaultScreen = role === "Ward manager" || role === "All access" ? "dashboard" : role === "Admin" ? "users" : role === "IG auditor" ? "audit" : "cover";
    setScreen(defaultScreen);
  }, [authLoading, user?.id, pathname, role, activeScreens]);

  useEffect(() => {
    if (authLoading || !user || role === "IG auditor") return undefined;
    let cancelled = false;
    wardApi("/api/ward/form-config")
      .then((data) => {
        if (cancelled) return;
        const published = data.form || initialFormConfig;
        setPublishedFormConfig(published);
        setFormConfig(data.draft || published);
        setFormConfigHistory(data.history || []);
        setHasFormDraft(Boolean(data.draft));
      })
      .catch((error) => { if (!cancelled) notify(error.message); });
    return () => { cancelled = true; };
  }, [authLoading, user?.id, role]);

  useEffect(() => {
    if (authLoading || !user) return undefined;
    let cancelled = false;
    wardApi("/api/ward/settings")
      .then((data) => {
        if (cancelled) return;
        if (role === "Admin" || role === "All access") setRetentionSettings({ ...initialRetentionSettings, ...data.settings });
        else setRetentionSettings((current) => ({ ...current, autoLockMinutes: data.settings.autoLockMinutes }));
      })
      .catch((error) => { if (!cancelled) notify(error.message); });
    return () => { cancelled = true; };
  }, [authLoading, user?.id, role]);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    async function loadScreen() {
      try {
        setLoadingScreen(true);
        if (screen === "dashboard" && (role === "Ward manager" || role === "All access")) {
          const [data, requestData] = await Promise.all([
            wardApi("/api/ward/dashboard"),
            wardApi("/api/ward/access-requests"),
          ]);
          if (!cancelled) {
            setDashboard(data);
            setAccessRequests(requestData.requests || []);
          }
        } else if (screen === "users" && (role === "Admin" || role === "All access")) {
          const [userData, requestData] = await Promise.all([wardApi("/api/ward/users"), wardApi("/api/ward/access-requests")]);
          if (!cancelled) {
            setUsers(userData.users || []);
            setAccessRequests(requestData.requests || []);
          }
        } else if (screen === "users" && role === "Ward manager") {
          const requestData = await wardApi("/api/ward/access-requests");
          if (!cancelled) setAccessRequests(requestData.requests || []);
        } else if (screen === "form-settings" && (role === "Admin" || role === "All access")) {
          const [data, userData] = await Promise.all([wardApi("/api/ward/form-config"), wardApi("/api/ward/users")]);
          if (!cancelled) {
            const published = data.form || initialFormConfig;
            setPublishedFormConfig(published);
            setFormConfig(data.draft || published);
            setFormConfigHistory(data.history || []);
            setHasFormDraft(Boolean(data.draft));
            setUsers(userData.users || []);
          }
        } else if (screen === "reports" && (role === "Ward manager" || role === "All access")) {
          const params = new URLSearchParams({ days: String(reportDays), shift: reportShift, section: reportSection });
          const data = await wardApi(`/api/ward/reports?${params.toString()}`);
          if (!cancelled) setReport(data.report);
        } else if (screen === "retention" && (role === "Admin" || role === "All access")) {
          const data = await wardApi("/api/ward/settings");
          if (!cancelled) {
            setRetentionSettings({ ...initialRetentionSettings, ...data.settings });
            setRetentionSummary(data);
          }
        } else if (["briefing", "specialist", "signoff"].includes(screen)) {
          await loadCurrentHandover();
        } else if (screen === "cover" && ["NIC", "Ward staff", "All access"].includes(role)) {
          await loadCurrentHandover();
        }
      } catch (error) {
        if (!cancelled) notify(error.message);
      } finally {
        if (!cancelled) setLoadingScreen(false);
      }
    }
    loadScreen();
    return () => { cancelled = true; };
  }, [authLoading, user?.id, role, screen, reportDays, reportShift, reportSection]);

  useEffect(() => {
    if (authLoading || !user || screen !== "records" || (role !== "Ward manager" && role !== "All access")) return undefined;
    let cancelled = false;
    const params = new URLSearchParams({ limit: "15", page: String(currentRecordPage) });
    Object.entries(recordFilters).forEach(([key, value]) => {
      if (value && value !== "All") params.set(key, value);
    });
    setLoadingScreen(true);
    wardApi(`/api/ward/handovers?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        setRecords((data.records || []).map(formatHandover));
        setRecordPagination(data.pagination || { page: 1, pageSize: 15, total: 0, pages: 0 });
      })
      .catch((error) => { if (!cancelled) notify(error.message); })
      .finally(() => { if (!cancelled) setLoadingScreen(false); });
    return () => { cancelled = true; };
  }, [authLoading, user?.id, role, screen, currentRecordPage, recordFilters]);

  useEffect(() => {
    if (authLoading || !user || screen !== "audit" || !["Ward manager", "Admin", "IG auditor", "All access"].includes(role)) return undefined;
    let cancelled = false;
    const params = new URLSearchParams({
      days: String(auditFilters.days),
      search: auditFilters.search,
      action: auditFilters.action,
      user: auditFilters.user,
      page: String(auditPage),
    });
    wardApi(`/api/ward/audit?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        setAudit(data.events || []);
        setAuditPagination(data.pagination || { page: 1, pageSize: 15, total: 0, pages: 0 });
        setAuditUsers(data.users || []);
        setAuditActions(data.actions || []);
      })
      .catch((error) => { if (!cancelled) notify(error.message); });
    return () => { cancelled = true; };
  }, [authLoading, user?.id, role, screen, auditFilters, auditPage]);

  useEffect(() => {
    if (!canEditForm || !activeRecord?.id || !["briefing", "specialist", "signoff"].includes(screen)) return undefined;
    window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(async () => {
      try {
        setSaving(true);
        const { incomingEmail: _incomingEmail, incomingPassword: _incomingPassword, ...savedPayload } = form;
        await queueHandoverSave(activeRecord.id, savedPayload);
      } catch (error) {
        notify(error.message);
      } finally {
        setSaving(false);
      }
    }, 650);
    return () => window.clearTimeout(autoSaveTimer.current);
  }, [form, activeRecord?.id, canEditForm, screen]);

  useEffect(() => {
    if (!user || authLoading || !Number.isInteger(retentionSettings.autoLockMinutes)) return undefined;
    let timer;
    const timeout = retentionSettings.autoLockMinutes * 60 * 1000;
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        signOut().then(() => router.replace("/sign-in")).catch((error) => notify(error.message || "Unable to lock your session."));
      }, timeout);
    };
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user?.id, authLoading, retentionSettings.autoLockMinutes]);

  if (authLoading) {
    return <main className="wh-auth-loading"><HeartPulse size={28} /><p>Opening Ward 3D secure workspace…</p></main>;
  }

  if (!user) {
    return <PublicCoverPage />;
  }

  return (
    <main className={`wh-app ${adminWorkspace ? "wh-admin-dashboard-app wh-ward-admin-app" : ""}`}>
      <header className={`wh-topbar ${["briefing", "specialist", "signoff"].includes(screen) ? "wh-form-topbar" : ""}`}>
        <a className="wh-brand" href="/" aria-label="Ward 3D home">
          <span className="wh-brand-mark"><HeartPulse size={22} strokeWidth={2.5} /></span>
          <span><strong>Barts Health</strong><small>NHS Trust · Ward 3D</small></span>
        </a>
        <div className="wh-topbar-title">
          {screen === "specialist" ? "Pre / Post Surgery & Specialist Details" : screen === "signoff" ? "Ward Values & Handover Sign-off" : screen === "briefing" ? "WARD 3D – NIC Safety Briefing & Handover" : "NIC Safety Briefing & Handover"}
        </div>
        {["briefing", "specialist", "signoff"].includes(screen) && (
          <div className="wh-form-meta">
            <label>Date<input type="date" value={form.date} readOnly aria-readonly="true" /></label>
            <label>Shift<input value={form.shift} readOnly aria-readonly="true" /></label>
            <label>Nurse in Charge<input value={form.nic} readOnly aria-readonly="true" /></label>
          </div>
        )}
        <div className="wh-topbar-tools">
          <span className="wh-secure-label"><ShieldCheck size={15} /> Secure workspace</span>
          <span className="wh-user-chip"><Users size={16} /><span><strong>{user.name}</strong><small>{role}</small></span></span>
          <button className="wh-icon-button wh-signout" onClick={signOutUser} aria-label="Sign out"><LogOut size={17} /></button>
          <button className="wh-icon-button wh-mobile-menu" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation"><Menu size={20} /></button>
        </div>
      </header>

      <div className={`wh-workspace ${adminWorkspace ? "wh-dashboard-workspace" : ""}`}>
        {isAdmin && (
          <aside className={`wh-sidebar ${menuOpen ? "open" : ""}`}>
            {adminWorkspace && <a className="wh-dashboard-brand" href={screenRoutes.dashboard}><strong>Barts Health</strong><small>NHS Trust · Ward 3D Handover</small></a>}
            <div className="wh-sidebar-heading">{adminWorkspace || screen === "dashboard" ? "ADMINISTRATION" : "WARD MANAGEMENT"}</div>
            {activeScreens.map(({ id, label, icon: Icon }) => (
              <button key={id} className={`wh-side-link ${screen === id ? "active" : ""}`} onClick={() => { setScreen(id); setMenuOpen(false); }}>
                <Icon size={18} /><span>{label}</span>
                {id === "users" && pendingCount > 0 && <b className="wh-count">{pendingCount}</b>}
              </button>
            ))}
            <div className="wh-sidebar-bottom">
              <div className="wh-dashboard-sidebar-user">
                <span className="wh-sidebar-avatar" aria-hidden="true">{user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "W3"}</span>
                <span className="wh-sidebar-user-details"><strong>{user.name}</strong><small>{role}</small></span>
                <button className="wh-sidebar-back" onClick={() => { setScreen("cover"); setMenuOpen(false); }}><ArrowLeft size={18} /><span>Back to handover form</span></button>
                <button className="wh-sidebar-signout" onClick={signOutUser}>Sign out</button>
              </div>
            </div>
          </aside>
        )}

        <section className={`wh-content ${isAdmin ? "admin-content" : ""} ${adminWorkspace ? "wh-dashboard-content" : ""}`}>
          {!isAdmin && (
            <nav className="wh-nurse-tabs" aria-label="Handover sections">
              {nurseScreens.map(({ id, label }) => (
                <button key={id} className={screen === id ? "active" : ""} onClick={() => setScreen(id)}>{label}</button>
              ))}
            </nav>
          )}

          {screen === "dashboard" && ["Ward manager", "All access"].includes(role) && (
            <header className="wh-dashboard-header">
              <div><h1>Dashboard</h1><p>Ward 3D overview · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p></div>
              <div><button className="wh-icon-button wh-dashboard-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle administration menu"><Menu size={17} /></button><button className="wh-button secondary compact" onClick={refreshDashboard} disabled={loadingScreen}><Activity size={14} className={loadingScreen ? "wh-spin" : ""} /> {loadingScreen ? "Refreshing…" : "Refresh"}</button><span className="wh-data-mode">Live data</span></div>
            </header>
          )}
          {adminWorkspace && screen !== "dashboard" && (
            <header className="wh-dashboard-header">
              <div>
                <h1>{screen === "records" ? "Handover records" : screen === "users" ? "Users & roles" : screen === "form-settings" ? "Form settings" : screen === "reports" ? "Reports" : screen === "audit" ? "Audit log" : "Data & retention"}</h1>
                <p>{screen === "records" ? "Search, open and print past handovers" : screen === "users" ? "Who can see and do what" : screen === "form-settings" ? "Change the handover form without a developer" : screen === "reports" ? "Trends across shifts · no patient identifiers" : screen === "audit" ? "Who viewed, edited, signed off or exported" : "How long records are kept and how they are protected"}</p>
              </div>
              <div className="wh-admin-header-actions">
                <button className="wh-icon-button wh-dashboard-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle administration menu"><Menu size={16} /></button>
                {screen === "records" && <button className="wh-button secondary compact" onClick={downloadRecordList}><Download size={15} /> Export list</button>}
                {screen === "users" && ["Admin", "All access"].includes(role) && <button className="wh-button primary compact" onClick={() => setNewUserDialogOpen(true)}><Plus size={15} /> Add user</button>}
                {screen === "form-settings" && <><button className="wh-button secondary compact" onClick={discardFormDraft}><RotateCcw size={14} /> Discard</button><button className="wh-button secondary compact" onClick={saveFormDraft}><Save size={14} /> Save draft</button><button className="wh-button primary compact" onClick={publishFormConfiguration}><CheckCircle2 size={14} /> Publish changes</button></>}
                {screen === "reports" && <><button className="wh-button secondary compact" onClick={exportReportPdf}><Printer size={14} /> Export PDF</button><button className="wh-button primary compact" onClick={exportReportExcel}><Download size={14} /> Export Excel</button></>}
                {screen === "audit" && <button className="wh-button secondary compact" onClick={downloadAuditLog} disabled={role === "IG auditor"}><Download size={14} /> Export log</button>}
                {screen === "retention" && ["Admin", "All access"].includes(role) && <button className="wh-button primary compact" onClick={saveRetentionSettings}><CheckCircle2 size={14} /> Save settings</button>}
                <span className="wh-data-mode">Live data</span>
              </div>
            </header>
          )}
          <div className={`wh-main ${["briefing", "specialist", "signoff"].includes(screen) ? "wh-reference-main" : ""} ${screen === "dashboard" ? "wh-dashboard-main-area" : adminWorkspace ? "wh-admin-page-main" : ""}`}>
            {screen === "cover" && (!isAdmin || ["Ward manager", "All access"].includes(role)) && (
              <section className="wh-cover">
                <div className="wh-cover-hero">
                  <div className="wh-cover-copy">
                    <span className="wh-cover-overline">BARTS HEALTH NHS TRUST</span>
                    <h1>3D NURSE IN CHARGE</h1>
                    <h2>Safety Briefing &amp; Handover</h2>
                    <p><CoverDateTime /></p>
                  </div>
                  <div className="wh-cover-visual" aria-hidden="true">
                    <div className="wh-visual-hospital"><span>WARD 3D</span><span><CoverDateTime timeOnly /></span><span>SHIFT SAFETY</span></div>
                    <div className="wh-visual-team">
                      <div className="wh-nurse-card"><span className="wh-nurse-portrait p1">✚</span><span>SAFETY FIRST</span></div>
                      <div className="wh-nurse-card"><span className="wh-nurse-portrait p2">✚</span><span>ONE TEAM</span></div>
                      <div className="wh-nurse-card"><span className="wh-nurse-portrait p3">✚</span><span>EVERY SHIFT</span></div>
                      <div className="wh-nurse-card"><span className="wh-nurse-portrait p4">✚</span><span>HERE FOR YOU</span></div>
                    </div>
                    <div className="wh-visual-overlay">
                      <span><CheckCircle2 size={17} /> Safe handover. Shared understanding.</span>
                      <span><Activity size={17} /> Patient safety starts with us.</span>
                    </div>
                  </div>
                  <div className="wh-cover-actions">
                    {role === "NIC" || role === "All access" ? <button className="wh-button primary" onClick={startHandover}><ClipboardCheck size={18} /> {activeRecord?.status === "IN_PROGRESS" ? "Resume handover" : "Start new handover"} <ArrowRight size={17} /></button> : <button className="wh-button primary" onClick={() => role === "Ward manager" ? setScreen("records") : activeRecord ? setScreen("briefing") : notify("There is no current handover available to view.")}><FileText size={18} /> View current handover</button>}
                    <button className="wh-button secondary" onClick={() => role === "Ward manager" || role === "All access" ? setScreen("records") : activeRecord ? setScreen("briefing") : notify("No current handover has been started for this shift.")}><FileText size={18} /> {role === "Ward manager" || role === "All access" ? "Open handover records" : "Open current shift"}</button>
                  </div>
                </div>
                <div className="wh-cover-footer">
                  <span>Ward 3D · NIC Safety Briefing &amp; Handover · Patient information is confidential</span>
                  <span className="wh-cover-status"><span /> Ready for briefing</span>
                </div>
              </section>
            )}

            {screen === "briefing" && (!isAdmin || role === "All access") && (
              <section className="wh-reference-form wh-briefing-page">
                <div className="wh-form-grid wh-briefing-grid">
                  <article className="wh-panel wh-briefing-overview" hidden={!isFormSectionEnabled("Patient & Staffing Overview")}>
                    <div className="wh-panel-heading"><span className="wh-heading-icon teal"><BedDouble size={18} /></span><div><h2>Patient &amp; staffing overview</h2><p>Use counts and bed numbers, never patient names.</p></div></div>
                    <div className="wh-grid-4">
                      <Field label="Patients on ward" icon="people" type="number" value={form.patients} onChange={(e) => updateForm("patients", e.target.value)} disabled={!canEditForm} min="0" />
                      <Field label="Empty beds" icon="bed" type="number" value={form.emptyBeds} onChange={(e) => updateForm("emptyBeds", e.target.value)} disabled={!canEditForm} min="0" />
                      <Field label="Amber / at risk" icon="warning" type="number" value={form.amber} onChange={(e) => updateForm("amber", e.target.value)} disabled={!canEditForm} min="0" />
                      <Field label="For discharge" icon="discharge" type="number" value={form.discharge} onChange={(e) => updateForm("discharge", e.target.value)} disabled={!canEditForm} min="0" />
                    </div>
                    <div className="wh-field-spaced"><TextAreaField label="Staffing concerns or skill mix" icon="people" value={form.staffing} onChange={(e) => updateForm("staffing", e.target.value)} disabled={!canEditForm} placeholder="Record staffing pressures, enhanced observations or support required." /></div>
                  </article>
                  <article className="wh-panel wh-briefing-news" hidden={!isFormSectionEnabled("Unwell / Deteriorating (NEWS)")}>
                    <div className="wh-panel-heading"><span className="wh-heading-icon amber"><WardClinicalIcon name="warning" size={18} /></span><div><h2>NEWS &amp; patients requiring attention</h2><p>Identify patients by bed number only.</p></div></div>
                    <div className="wh-news-entry"><span className="wh-news-warning-icon" role="img" aria-label="Warning"><span>!</span></span><TextAreaField label="Bed number, NEWS score and action" value={form.news} onChange={(e) => updateForm("news", e.target.value)} disabled={!canEditForm} placeholder="e.g. Bed 12 · NEWS 5 · Medical review requested" /></div>
                  </article>
                  <article className="wh-panel wh-briefing-equipment" hidden={!isFormSectionEnabled("Equipment & Safety Checks")}>
                    <div className="wh-panel-heading"><span className="wh-heading-icon amber"><WardClinicalIcon name="trolley" size={18} /></span><div><h2>Equipment &amp; safety checks</h2><p>Resuscitation trolley and other equipment.</p></div></div>
                    <div className="wh-equipment-fields">
                      <label><WardClinicalIcon name="trolley" size={16} /> Resuscitation trolley used<select value={form.equipmentUsed} onChange={(event) => updateForm("equipmentUsed", event.target.value)} disabled={!canEditForm}><option value="">Select</option><option>Yes</option><option>No</option></select></label>
                      <label><WardClinicalIcon name="trolley" size={16} /> Checked &amp; sealed<select value={form.equipmentChecked} onChange={(event) => updateForm("equipmentChecked", event.target.value)} disabled={!canEditForm}><option value="">Select</option><option>Yes</option><option>No</option><option>N/A</option></select></label>
                    </div>
                    <div className="wh-field-spaced"><TextAreaField label="Other equipment issue / location" value={form.equipmentNotes} onChange={(e) => updateForm("equipmentNotes", e.target.value)} disabled={!canEditForm} placeholder="Equipment issue and location" rows={2} /></div>
                  </article>
                  <article className="wh-panel wh-briefing-appointments" hidden={!isFormSectionEnabled("Appointments / Transport")}>
                    <div className="wh-panel-heading"><span className="wh-heading-icon blue"><WardClinicalIcon name="calendar" size={18} /></span><div><h2>Appointments / transport</h2><p>Plans and escort requirements.</p></div></div>
                    <StructuredFields fields={[{ key: "appointments", label: "Internal appointment" }, { key: "externalAppointments", label: "External appointment" }, { key: "transport", label: "Transport" }, { key: "escorts", label: "Escorts" }]} values={form} disabled={!canEditForm} onChange={(key, value) => updateForm(key, value)} />
                  </article>
                  <article className="wh-panel wh-briefing-mobility" hidden={!isFormSectionEnabled("Mobility / Surgical Instructions")}>
                    <div className="wh-panel-heading"><span className="wh-heading-icon violet"><WardClinicalIcon name="bed" size={18} /></span><div><h2>Mobility / surgical instructions</h2><p>Activity and care requirements.</p></div></div>
                    <StructuredFields fields={[{ key: "bedRest", label: "Bed Rest" }, { key: "levelDuration", label: "Level / Duration" }, { key: "concern", label: "Concern" }]} values={form.mobilityDetails} disabled={!canEditForm} onChange={(key, value) => updateNestedForm("mobilityDetails", key, value)} />
                  </article>
                  <article className="wh-panel wh-briefing-concerns" hidden={!isFormSectionEnabled("Clinical & Safeguarding Concerns")}>
                    <div className="wh-panel-heading"><span className="wh-heading-icon rose"><WardClinicalIcon name="safeguarding" size={18} /></span><div><h2>Clinical &amp; safeguarding concerns</h2><p>Tick each concern and record bed number and action. Never enter patient names.</p></div></div>
                    <div className="wh-concern-table">
                      <div className="wh-concern-table-head"><span>Concern</span><span>Notes / Patient identifiers / Actions:</span></div>
                      {(activeHandoverFormConfig.concerns || formConfig.concerns).filter((item) => item.enabled).map(({ label }) => (
                        <div className="wh-concern-row" key={label}>
                          <label className={`wh-concern-select ${form.concerns[label] ? "checked" : ""}`}>
                            <input type="checkbox" checked={form.concerns[label] === true || form.concerns[label]?.enabled === true} disabled={!canEditForm} onChange={(event) => updateNestedForm("concerns", label, { enabled: event.target.checked, note: form.concernNotes?.[label] || "" })} />
                            <WardClinicalIcon className="wh-concern-code" name={getWardConcernIconName(label)} size={18} /><strong>{label}</strong>
                          </label>
                          <input aria-label={`${label} bed and action`} value={form.concernNotes?.[label] || form.concerns[label]?.note || ""} onChange={(event) => { const note = event.target.value; setForm((current) => ({ ...current, concernNotes: { ...current.concernNotes, [label]: note }, concerns: { ...current.concerns, [label]: { enabled: current.concerns[label] === true || current.concerns[label]?.enabled === true, note } } })); }} disabled={!canEditForm || !(form.concerns[label] === true || form.concerns[label]?.enabled === true)} placeholder="Bed / patient identifier · action" />
                        </div>
                      ))}
                    </div>
                  </article>
                  <article className="wh-panel wh-briefing-instructions">
                    <div className="wh-panel-heading"><span className="wh-heading-icon violet"><WardClinicalIcon name="clinical" size={18} /></span><div><h2>Clinical &amp; surgical instructions</h2><p>Shift-specific clinical checks and concerns.</p></div></div>
                    <StructuredFields fields={[{ key: "flap", label: "FLAP – IGAP" }, { key: "checksFrequency", label: "Checks Frequency" }, { key: "clinicalConcerns", label: "Concerns" }]} values={form} disabled={!canEditForm} onChange={(key, value) => updateForm(key, value)} />
                  </article>
                </div>
                <div className="wh-form-navigation"><button className="wh-button secondary" onClick={() => setScreen("cover")}><ArrowLeft size={17} /> Cover</button><button className="wh-button primary" onClick={() => setScreen("specialist")}>Surgical &amp; Specialist <ArrowRight size={17} /></button></div>
              </section>
            )}

            {screen === "specialist" && (!isAdmin || role === "All access") && (
              <section className="wh-reference-form wh-specialist-page">
                <div className="wh-form-grid two-col wh-specialist-grid">
                  <StructuredPanel className="wh-specialist-surgery" title="Pre & Post Surgery" caption="Use bed numbers, not patient names." icon="clinical" fields={[{ key: "nbm", label: "NBM" }, { key: "imaging", label: "Imaging" }, { key: "emergencyTheatre", label: "Emergency Theatre" }, { key: "tci", label: "TCI (Day before Surgery)" }]} values={form.surgicalDetails} disabled={!canEditForm} onChange={(key, value) => updateNestedForm("surgicalDetails", key, value)} tone="violet" hidden={!isFormSectionEnabled("Pre & Post Surgery")} />
                  <StructuredPanel className="wh-specialist-feed" title="External Feed" caption="Enter bed number and relevant line / feed plan." icon="feed" fields={[{ key: "ng", label: "NG" }, { key: "nj", label: "NJ" }, { key: "rig", label: "RIG" }, { key: "note", label: "Note" }, { key: "tpn", label: "TPN" }, { key: "peg", label: "PEG" }, { key: "jTube", label: "J-Tube" }]} values={form.feedDetails} disabled={!canEditForm || !isFormSectionEnabled("External Feed")} onChange={(key, value) => updateNestedForm("feedDetails", key, value)} tone="teal" hidden={!isFormSectionEnabled("External Feed")} />
                  <StructuredPanel className="wh-specialist-labs" title="Labs & Infusion" caption="Bloods, products and infusions." icon="blood" fields={[{ key: "preOpBlood", label: "Pre-Op Blood" }, { key: "postOpBlood", label: "Post-Op Blood" }, { key: "generalBlood", label: "General Blood" }, { key: "bloodProduct", label: "Blood Product" }, { key: "ivInfusion", label: "IV Infusion" }]} values={form.labDetails} disabled={!canEditForm} onChange={(key, value) => updateNestedForm("labDetails", key, value)} tone="rose" hidden={!isFormSectionEnabled("Labs & Infusion")} />
                  <StructuredPanel className="wh-specialist-medication" title="Medications & Discharges" caption="Controlled drug checks and outstanding actions." icon="medication" fields={[{ key: "cdSchedule3", label: "CD & Schedule 3", options: ["Ordered", "Received", "Not Received"], multiple: true }, { key: "note", label: "Note" }]} values={form.medicationDetails} disabled={!canEditForm} onChange={(key, value) => updateNestedForm("medicationDetails", key, value)} tone="rose" hidden={!isFormSectionEnabled("Medications & Discharges")} />
                  <StructuredPanel className="wh-specialist-governance" title="Governance & Safety" caption="Record references, not confidential incident details." icon="safeguarding" fields={[{ key: "complaint", label: "Complaint" }, { key: "incidentReport", label: "Incident Report" }, { key: "datixReference", label: "Datix Ref No" }, { key: "idhPoc", label: "IDH & POC" }]} values={form.governanceDetails} disabled={!canEditForm} onChange={(key, value) => updateNestedForm("governanceDetails", key, value)} tone="amber" hidden={!isFormSectionEnabled("Governance & Safety")} />
                  <StructuredPanel className="wh-specialist-tta" title="TTA" caption="Track medicines to take away." icon="tta" fields={[{ key: "tta", label: "Outstanding" }]} values={form} disabled={!canEditForm} onChange={(key, value) => updateForm(key, value)} tone="blue" hidden={!isFormSectionEnabled("TTA")} />
                  <StructuredPanel className="wh-specialist-instructions" title="Specific Instructions" caption="Drain and other surgical care instructions." icon="drain" fields={[{ key: "specificInstructions", label: "Drain" }]} values={form} disabled={!canEditForm} onChange={(key, value) => updateForm(key, value)} tone="violet" hidden={!isFormSectionEnabled("Mobility / Surgical Instructions")} />
                  <StructuredPanel className="wh-specialist-vascular" title="Vascular Access" caption="Central and peripheral access devices." icon="line" fields={[{ key: "cvc", label: "CVC Line" }, { key: "picc", label: "PICC Line" }, { key: "note", label: "Note" }]} values={form.vascularDetails} disabled={!canEditForm} onChange={(key, value) => updateNestedForm("vascularDetails", key, value)} tone="teal" hidden={!isFormSectionEnabled("Vascular Access")} />
                  <StructuredPanel className="wh-specialist-transport" title="Transport" caption="Hospital transport and reference." icon="transport" fields={[{ key: "hospitalTransport", label: "Hospital Transport" }, { key: "reference", label: "Ref. No" }]} values={form.transportDetails} disabled={!canEditForm} onChange={(key, value) => updateNestedForm("transportDetails", key, value)} tone="amber" hidden={!isFormSectionEnabled("Appointments / Transport")} />
                  <article className="wh-panel wh-panel-wide wh-reference-panel wh-specialist-additional" hidden={!isFormSectionEnabled("Mobility / Surgical Instructions")}>
                    <div className="wh-panel-heading"><span className="wh-heading-icon blue"><FileText size={18} /></span><div><h2>Additional note</h2><p>Notes for the next shift. Do not include patient names.</p></div></div>
                    <TextAreaField label="Additional handover notes" value={form.additional} onChange={(event) => updateForm("additional", event.target.value)} disabled={!canEditForm} placeholder="Bed number and information needed by the next shift" rows={10} />
                  </article>
                </div>
                <div className="wh-form-navigation"><button className="wh-button secondary" onClick={() => setScreen("briefing")}><ArrowLeft size={17} /> Briefing</button><button className="wh-button primary" onClick={() => setScreen("signoff")}>Ward values &amp; sign-off <ArrowRight size={17} /></button></div>
              </section>
            )}

            {screen === "signoff" && (!isAdmin || role === "All access") && (
              <section className="wh-reference-form wh-signoff-page">
                <div className="wh-signoff-layout">
                  <article className="wh-wecare-panel">
                    <h2>3D Ward</h2><p>We are committed to our <strong>WECARE</strong> values:</p>
                    {[["W", "WELCOMING", "We make people feel welcome."], ["E", "ENGAGING", "We communicate openly."], ["C", "COLLABORATIVE", "We're inclusive and we work together."], ["A", "ACCOUNTABLE", "We take pride in what we do."], ["R", "RESPECTFUL", "We treat everyone with respect."], ["E", "EQUITABLE", "We strive for equity and fairness."]].map(([letter, title, caption]) => <div className="wh-wecare-row" key={`${letter}-${title}`}><b>{letter}</b><span><strong>{title}</strong><small>{caption}</small></span></div>)}
                  </article>
                  <div className="wh-signoff-right">
                    <article className="wh-panel wh-reference-panel wh-signoff-summary">
                      <div className="wh-panel-heading"><h2>Handover Sign-off</h2></div>
                      <p className="wh-signoff-intro">Outgoing and incoming Nurse in Charge confirm the briefing has been given, and that DNAR, deterioration, safeguarding and controlled drug items were discussed.</p>
                      <div className="wh-signoff-details">
                        <div><strong>Outgoing NIC:</strong><span>{activeRecord?.outgoingNicName || user.name}</span></div>
                        <div><strong>Incoming NIC:</strong><span>{activeRecord?.incomingNicName || (isLocked ? form.incomingSigner : "Pending incoming NIC confirmation")}</span></div>
                        <div><strong>Time of handover:</strong><span>{activeRecord?.signedOffAt || activeRecord?.createdAt ? new Date(activeRecord.signedOffAt || activeRecord.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "Not started"}</span></div>
                      </div>
                    </article>
                    <article className="wh-panel wh-reference-panel wh-signoff-checks">
                      <div className="wh-panel-heading"><h2>Checks Before Sign-off</h2></div>
                      <div className="wh-check-list">
                        {signoffChecks.map(({ id, label }) => (
                          <label className={`wh-check-row ${form.checks[id] ? "done" : ""}`} key={id}>
                            <input type="checkbox" checked={Boolean(form.checks[id])} disabled={!canEditForm} onChange={(event) => updateForm("checks", { ...form.checks, [id]: event.target.checked })} />
                            <span className="wh-checkbox"><Check size={13} /></span><span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </article>
                    <article className="wh-panel wh-reference-panel wh-signoff-notes">
                      <div className="wh-panel-heading"><h2>Notes for Incoming NIC</h2></div>
                      <TextAreaField label="Handover notes" value={form.incomingNotes} onChange={(event) => updateForm("incomingNotes", event.target.value)} disabled={!canEditForm} placeholder="Notes for the oncoming nurse in charge" rows={7} />
                    </article>
                  </div>
                </div>
                <div className="wh-signoff-actions">
                  <button className="wh-button secondary" onClick={() => setScreen("specialist")}><ArrowLeft size={16} /> Surgical &amp; Specialist</button>
                  <div>
                    <button className="wh-button primary" disabled={!canEditForm || saving} onClick={() => {
                      if (!signoffChecks.every(({ id }) => form.checks[id] === true)) {
                        notify("Complete all six safety checks before signing off.");
                        return;
                      }
                      setSignoffDialogOpen(true);
                    }}>{isLocked ? "Handover signed off" : saving ? "Signing off…" : "Sign off & complete handover"}</button>
                    <button className="wh-button secondary" disabled={!isLocked} onClick={() => downloadHandoverPdf(activeRecord)}><Printer size={16} /> Print / Save PDF</button>
                  </div>
                </div>
              </section>
            )}

            {screen === "dashboard" && ["Ward manager", "All access"].includes(role) && (
              <section className="wh-live-dashboard">
                <div className="wh-dashboard-metrics">
                  <article className="wh-dashboard-metric green"><span>HANDOVERS TODAY</span><strong>{dashboard?.metrics?.handoversToday || 0} / {dashboard?.metrics?.handoversExpected || 3}</strong><small>{dashboard?.metrics?.handoversExpected - dashboard?.metrics?.handoversToday > 0 ? `${dashboard.metrics.handoversExpected - dashboard.metrics.handoversToday} shift${dashboard.metrics.handoversExpected - dashboard.metrics.handoversToday === 1 ? "" : "s"} pending` : "All shifts recorded"}</small></article>
                  <article className="wh-dashboard-metric blue"><span>DNAR</span><strong>{dashboard?.metrics?.dnar || 0}</strong><small>Across the ward</small></article>
                  <article className="wh-dashboard-metric red"><span>DETERIORATING<br />(NEWS)</span><strong>{dashboard?.metrics?.deteriorating || 0}</strong><small>Beds with open NEWS flags</small></article>
                  <article className="wh-dashboard-metric amber"><span>SAFEGUARDING</span><strong>{dashboard?.metrics?.safeguarding || 0}</strong><small>Open handover flags</small></article>
                  <article className="wh-dashboard-metric blue"><span>TTAS OUTSTANDING</span><strong>{dashboard?.metrics?.ttaOutstanding || 0}</strong><small>Requires follow-up</small></article>
                  <article className="wh-dashboard-metric red"><span>UNSIGNED<br />HANDOVERS</span><strong>{dashboard?.metrics?.unsigned || 0}</strong><small>Awaiting NIC sign-off</small></article>
                </div>

                <div className="wh-live-dashboard-columns">
                  <div className="wh-live-dashboard-left">
                    <article className="wh-panel wh-dashboard-panel wh-today-panel">
                      <div className="wh-dashboard-panel-title">TODAY&apos;S HANDOVERS BY SHIFT</div>
                      <div className="wh-dashboard-table-scroll">
                        <table className="wh-dashboard-table">
                          <thead><tr><th>SHIFT</th><th>NURSE IN<br />CHARGE</th><th>PTS</th><th>AMBER</th><th>STATUS</th><th>SIGNED OFF BY</th></tr></thead>
                          <tbody>{(dashboard?.shiftRows || []).map((row) => (
                            <tr key={row.id} onClick={() => openRecord(row)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") openRecord(row); }}>
                              <td>{row.shift}{row.signedOffAt && <small>{new Date(row.signedOffAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</small>}</td>
                              <td>{row.nic}</td><td>{row.patients || "—"}</td><td>{row.amber || "—"}</td>
                              <td><span className={`wh-dashboard-status ${row.status === "SIGNED_OFF" ? "signed" : "pending"}`}>{row.status === "SIGNED_OFF" ? "Signed off" : "Pending"}</span></td>
                              <td>{row.signedOffBy ? shortName(row.signedOffBy) : "—"}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                        {!dashboard?.shiftRows?.length && <div className="wh-dashboard-empty">No handovers have been started today.</div>}
                      </div>
                    </article>
                    <article className="wh-panel wh-dashboard-panel wh-completion-panel">
                      <div className="wh-dashboard-panel-title">HANDOVER COMPLETION – LAST 7 DAYS</div>
                      <div className="wh-completion-chart">
                        {(dashboard?.weeklyCompletion || []).map((day) => (
                          <div className="wh-completion-day" key={day.date}>
                            <strong>{day.rate}%</strong>
                            <div className="wh-completion-bar-wrap"><span style={{ height: `${Math.min(day.rate, 100)}%` }} /></div>
                            <small>{day.day}</small>
                          </div>
                        ))}
                      </div>
                    </article>
                    <article className="wh-panel wh-dashboard-panel wh-needs-panel">
                      <div className="wh-dashboard-panel-title">NEEDS ATTENTION</div>
                      {dashboard?.metrics?.unsigned > 0 && <button className="wh-needs-row" onClick={() => setScreen("records")}><span className="wh-needs-tag red">Unsigned</span><span>{dashboard.metrics.unsigned} handover{dashboard.metrics.unsigned === 1 ? "" : "s"} awaiting sign-off</span></button>}
                      {dashboard?.metrics?.ttaOutstanding > 0 && <button className="wh-needs-row" onClick={() => setScreen("records")}><span className="wh-needs-tag amber">TTA</span><span>{dashboard.metrics.ttaOutstanding} outstanding – requires follow-up</span></button>}
                      {dashboard?.metrics?.failedSignIns > 0 && <button className="wh-needs-row" onClick={() => setScreen("audit")}><span className="wh-needs-tag red">Security</span><span>{dashboard.metrics.failedSignIns} failed sign-in attempt{dashboard.metrics.failedSignIns === 1 ? "" : "s"} in the last 7 days</span></button>}
                      {pendingCount > 0 && <button className="wh-needs-row" onClick={() => setScreen("users")}><span className="wh-needs-tag blue">Review</span><span>{pendingCount} access request{pendingCount === 1 ? "" : "s"} awaiting review</span></button>}
                      {!dashboard?.metrics?.unsigned && !dashboard?.metrics?.ttaOutstanding && !dashboard?.metrics?.failedSignIns && !pendingCount && <div className="wh-dashboard-empty">Nothing needs immediate attention.</div>}
                    </article>
                  </div>
                  <div className="wh-live-dashboard-right">
                    <article className="wh-panel wh-dashboard-panel wh-open-flags-panel">
                      <div className="wh-dashboard-panel-title wh-dashboard-panel-title-between"><span>OPEN SAFETY FLAGS</span><small>Bed numbers only</small></div>
                      <div className="wh-dashboard-table-scroll">
                        <table className="wh-dashboard-table">
                          <thead><tr><th>BED</th><th>FLAG</th><th>RAISED IN</th><th>ACTION</th></tr></thead>
                          <tbody>{(dashboard?.flags || []).map((flag, index) => (
                            <tr key={`${flag.recordId}-${flag.flag}-${index}`} onClick={() => openRecord({ id: flag.recordId })} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") openRecord({ id: flag.recordId }); }}>
                              <td>{String(flag.bed || "—").replace(/^Bed\\s*/i, "")}</td>
                              <td><span className={`wh-flag-pill ${/news/i.test(flag.flag) ? "red" : /safeguarding/i.test(flag.flag) ? "amber" : "blue"}`}>{flag.flag === "NEWS" ? (String(flag.detail).match(/NEWS\s*\d+/i)?.[0] || "NEWS") : flag.flag}</span></td>
                              <td>{flag.shift} handover</td><td>{dashboardFlagAction(flag.detail)}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                        {!dashboard?.flags?.length && <div className="wh-dashboard-empty">No open safety flags.</div>}
                      </div>
                    </article>
                    <article className="wh-panel wh-dashboard-panel wh-activity-panel">
                      <div className="wh-dashboard-panel-title">RECENT ACTIVITY</div>
                      <div className="wh-dashboard-table-scroll">
                        <table className="wh-dashboard-table">
                          <thead><tr><th>TIME</th><th>USER</th><th>ACTIVITY</th></tr></thead>
                          <tbody>{(dashboard?.recentAudit || []).map((event, index) => (
                            <tr key={`${event.createdAt}-${event.recordId || "activity"}-${index}`}>
                              <td>{new Date(event.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</td>
                              <td>{shortName(event.user)}</td><td>{event.action}{event.recordId ? ` ${event.shift ? `${event.shift} ` : ""}handover` : ""}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                        {!dashboard?.recentAudit?.length && <div className="wh-dashboard-empty">No recent ward activity.</div>}
                      </div>
                    </article>
                  </div>
                </div>
              </section>
            )}

            {screen === "records" && isAdmin && (
              <section className="wh-records-page">
                <form className="wh-record-filterbar" onSubmit={(event) => { event.preventDefault(); setCurrentRecordPage(1); setRecordFilters(recordFiltersDraft); }}>
                  <label><span className="sr-only">Search by date, NIC or reference</span><input value={recordFiltersDraft.search} onChange={(event) => setRecordFiltersDraft((current) => ({ ...current, search: event.target.value }))} placeholder="Search by date, NIC or reference…" /></label>
                  <label><span className="sr-only">Filter by shift</span><select value={recordFiltersDraft.shift} onChange={(event) => setRecordFiltersDraft((current) => ({ ...current, shift: event.target.value }))}><option>All</option>{["Early", "Late", "Night", "Day shift", "Night shift"].map((shift) => <option key={shift}>{shift}</option>)}</select></label>
                  <label><span className="sr-only">Filter by status</span><select value={recordFiltersDraft.status} onChange={(event) => setRecordFiltersDraft((current) => ({ ...current, status: event.target.value }))}><option>All</option><option value="SIGNED_OFF">Signed off</option><option value="IN_PROGRESS">Not signed off</option></select></label>
                  <label><span className="sr-only">From date</span><input type="date" value={recordFiltersDraft.from} onChange={(event) => setRecordFiltersDraft((current) => ({ ...current, from: event.target.value }))} /></label>
                  <label><span className="sr-only">To date</span><input type="date" value={recordFiltersDraft.to} onChange={(event) => setRecordFiltersDraft((current) => ({ ...current, to: event.target.value }))} /></label>
                  <button className="wh-button primary compact" type="submit"><Filter size={14} /> Apply filters</button>
                </form>
                <article className="wh-panel wh-records-panel">
                  <div className="wh-admin-panel-heading"><strong>HANDOVER RECORDS</strong><span>Read-only · records cannot be edited or deleted here</span></div>
                  <div className="wh-table-wrap">
                    <table className="wh-table wh-records-table">
                      <thead><tr><th>DATE</th><th>SHIFT</th><th>NURSE IN CHARGE</th><th>STATUS</th><th>SIGNED OFF BY</th><th>FLAGS</th><th aria-label="Actions" /></tr></thead>
                      <tbody>{filteredRecords.map((record) => (
                        <tr key={record.id}>
                          <td>{record.date}</td><td>{record.shift}</td><td>{record.nic}</td>
                          <td><span className={`wh-record-state ${record.rawStatus === "SIGNED_OFF" ? "signed" : "pending"}`}>{record.rawStatus === "SIGNED_OFF" ? "Signed off" : "Not signed off"}</span></td>
                          <td>{record.rawStatus === "SIGNED_OFF" ? record.signedOffBy : "—"}</td>
                          <td>{record.dnarFlags} DNAR · {record.newsFlags} NEWS</td>
                          <td><div className="wh-record-actions"><button onClick={() => openRecord(record)}>Open</button><button disabled={record.rawStatus !== "SIGNED_OFF"} onClick={() => downloadHandoverPdf(record)} aria-label={`Download PDF for ${record.date} ${record.shift}`}><Printer size={14} /> PDF</button></div></td>
                        </tr>
                      ))}</tbody>
                    </table>
                    {!filteredRecords.length && <div className="wh-empty">{loadingScreen ? "Loading handover records…" : "No handovers match these filters."}</div>}
                  </div>
                  <footer className="wh-record-pagination">
                    <span>Showing {recordPagination.total ? (currentRecordPage - 1) * recordPagination.pageSize + 1 : 0}–{Math.min(currentRecordPage * recordPagination.pageSize, recordPagination.total)} of {recordPagination.total} records</span>
                    <nav aria-label="Handover record pages">
                      {getPageNumbers(recordPagination.pages, currentRecordPage).map((page, index) => page === "ellipsis"
                        ? <span key={`ellipsis-${index}`} aria-hidden="true">…</span>
                        : <button key={page} className={currentRecordPage === page ? "active" : ""} aria-current={currentRecordPage === page ? "page" : undefined} onClick={() => setCurrentRecordPage(page)}>{page}</button>)}
                      <button aria-label="Next page" disabled={currentRecordPage >= recordPagination.pages} onClick={() => setCurrentRecordPage((page) => page + 1)}>›</button>
                    </nav>
                  </footer>
                </article>
              </section>
            )}

            {screen === "users" && isAdmin && (
              <section className="wh-users-layout">
                <div className="wh-users-main">
                  {["Admin", "All access"].includes(role) && <article className="wh-panel wh-admin-panel wh-users-panel">
                    <div className="wh-admin-panel-heading"><strong>USERS</strong><span>Ward 3D accounts</span></div>
                    <div className="wh-user-filterbar">
                      <label className="wh-user-search"><Search size={15} /><input placeholder="Search staff by name or role…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
                      <select aria-label="Filter users by role" value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value)}><option>All</option>{["NIC", "Ward staff", "Ward manager", "Admin", "IG auditor", "All access"].map((item) => <option key={item}>{item}</option>)}</select>
                    </div>
                    <div className="wh-table-wrap"><table className="wh-table wh-users-table">
                      <thead><tr><th>NAME</th><th>ROLE</th><th>LAST SIGN-IN</th><th>STATUS</th><th /></tr></thead>
                      <tbody>{filteredUsers.map((wardUser) => (
                        <tr key={wardUser.id}>
                          <td><strong>{wardUser.name}</strong><small className="wh-table-sub">{wardUser.staffNumber || wardUser.email}</small></td>
                          <td>{editingUserId === wardUser.id
                            ? <select aria-label={`Edit role for ${wardUser.name}`} value={editingUserRole} onChange={(event) => setEditingUserRole(event.target.value)}>{["NIC", "Ward staff", "Ward manager", "Admin", "IG auditor"].map((item) => <option key={item}>{item}</option>)}</select>
                            : <span className={`wh-role-pill ${wardUser.role.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{wardUser.role}</span>}</td>
                          <td>{wardUser.lastSignInAt ? formatDateTime(wardUser.lastSignInAt) : "Never"}</td>
                          <td><span className={`wh-record-state ${wardUser.accountStatus === "ACTIVE" ? "signed" : "pending"}`}>{displayStatus(wardUser.accountStatus)}</span></td>
                          <td><div className="wh-user-actions">
                            {editingUserId === wardUser.id
                              ? <><button disabled={wardUser.id === user.id} onClick={() => changeUser(wardUser.id, "role", editingUserRole)}>Save</button><button onClick={() => setEditingUserId(null)}>Cancel</button></>
                              : <button disabled={wardUser.id === user.id || wardUser.role === "All access"} onClick={() => { setEditingUserId(wardUser.id); setEditingUserRole(wardUser.role); }}>Edit</button>}
                            <button className={wardUser.accountStatus === "ACTIVE" ? "danger" : ""} disabled={wardUser.id === user.id} onClick={() => changeUser(wardUser.id, wardUser.accountStatus === "ACTIVE" ? "disable" : "enable")}>{wardUser.accountStatus === "ACTIVE" ? "Disable" : "Enable"}</button>
                          </div></td>
                        </tr>
                      ))}</tbody>
                    </table>{!filteredUsers.length && <div className="wh-empty">{users.length ? "No users match these filters." : "No Ward 3D users are available."}</div>}</div>
                  </article>}
                </div>
                <div className="wh-users-side">
                  <article className="wh-panel wh-admin-panel wh-permissions-card">
                    <div className="wh-admin-panel-heading"><strong>ROLE PERMISSIONS</strong><span>Server-enforced access matrix</span></div>
                    <div className="wh-table-wrap"><table className="wh-table wh-permissions-table">
                      <thead><tr><th>PERMISSION</th>{["NIC", "STAFF", "MGR", "ADMIN", "IG", "ALL ACCESS"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
                      <tbody>{[
                        ["Fill in & sign off handover", [1, 0, 0, 0, 0, 1]],
                        ["View current handover", [1, 1, 1, 0, 0, 1]],
                        ["View past records", [0, 0, 1, 0, 0, 1]],
                        ["Reports", [0, 0, 1, 0, 0, 1]],
                        ["Manage users", [0, 0, 0, 1, 0, 1]],
                        ["Edit form settings", [0, 0, 0, 1, 0, 1]],
                        ["View audit log", [0, 0, 1, 1, 1, 1]],
                        ["See patient notes", [1, 1, 1, 0, 0, 1]],
                      ].map(([label, permissions]) => <tr key={label}><td>{label}</td>{permissions.map((allowed, index) => <td key={`${label}-${index}`}>{allowed ? <Check size={14} aria-label="Allowed" /> : <span aria-label="Not allowed">–</span>}</td>)}</tr>)}</tbody>
                    </table></div>
                  </article>
                  <article className="wh-panel wh-admin-panel wh-requests-panel">
                    <div className="wh-admin-panel-heading"><strong>ACCESS REQUESTS</strong><span>{pendingCount} waiting</span></div>
                    <div className="wh-table-wrap"><table className="wh-table wh-requests-table">
                      <thead><tr><th>REQUEST</th><th>ROLE ASKED</th><th>STATUS</th><th /></tr></thead>
                      <tbody>{accessRequests.map((request) => {
                        const grantedRole = accessRoleOverrides[request.id] || request.requestedRole;
                        return <tr key={request.id}><td>{request.name}<small className="wh-table-sub">{request.email}</small><small className="wh-table-sub">Staff no. {request.staffNumber} · Approver: {request.approverName}</small><small className="wh-table-sub">Requested {formatDateTime(request.requestedAt)}</small></td><td><span className={`wh-role-pill ${request.requestedRole.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{request.requestedRole}</span><select aria-label={`Grant role to ${request.name}`} value={grantedRole} onChange={(event) => setAccessRoleOverrides((current) => ({ ...current, [request.id]: event.target.value }))}><option>Ward staff</option><option>NIC</option><option disabled={role !== "Admin" && role !== "All access"}>Ward manager</option></select></td><td><span className="wh-record-state pending">{request.status}</span></td><td><div className="wh-user-actions"><button className="primary" disabled={role === "Ward manager" && grantedRole === "Ward manager"} onClick={() => decideAccessRequest(request, "APPROVE")}>Approve</button><button className="danger" onClick={() => decideAccessRequest(request, "DECLINE")}>Decline</button></div></td></tr>;
                      })}</tbody>
                    </table>{!accessRequests.length && <div className="wh-empty">No access requests are waiting.</div>}</div>
                  </article>
                </div>
                {newUserDialogOpen && ["Admin", "All access"].includes(role) && <div className="wh-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingUser) setNewUserDialogOpen(false); }}>
                  <form className="wh-record-modal wh-add-user-dialog" role="dialog" aria-modal="true" aria-labelledby="wh-add-user-title" onSubmit={createWardUser}>
                    <div className="wh-panel-heading between"><div><p className="wh-eyebrow">WARD 3D · ACCESS CONTROL</p><h2 id="wh-add-user-title">Add user</h2></div><button type="button" className="wh-icon-button" aria-label="Close dialog" disabled={savingUser} onClick={() => setNewUserDialogOpen(false)}><X size={18} /></button></div>
                    <label className="wh-field"><span>Full name</span><input required maxLength={120} value={newUser.name} onChange={(event) => setNewUser((current) => ({ ...current, name: event.target.value }))} /></label>
                    <label className="wh-field"><span>Email address</span><input required type="email" value={newUser.email} onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} /></label>
                    <label className="wh-field"><span>Staff number</span><input maxLength={40} value={newUser.staffNumber} onChange={(event) => setNewUser((current) => ({ ...current, staffNumber: event.target.value }))} /></label>
                    <label className="wh-field"><span>Role</span><select value={newUser.role} onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value }))}>{["NIC", "Ward staff", "Ward manager", "Admin", "IG auditor"].map((item) => <option key={item}>{item}</option>)}</select></label>
                    <label className="wh-field"><span>Initial password</span><input required type="password" minLength={12} value={newUser.password} onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} /><small>At least 12 characters with upper/lower case, a number and a symbol.</small></label>
                    <div className="wh-record-modal-actions"><button type="button" className="wh-button secondary" onClick={() => setNewUserDialogOpen(false)} disabled={savingUser}>Cancel</button><button type="submit" className="wh-button primary" disabled={savingUser}>{savingUser ? "Creating…" : "Create user"}</button></div>
                  </form>
                </div>}
              </section>
            )}

            {screen === "form-settings" && isAdmin && (
              <section className="wh-form-settings-grid">
                <article className="wh-panel wh-admin-panel wh-settings-column wh-concern-settings">
                  <div className="wh-admin-panel-heading"><strong>CLINICAL &amp; SAFEGUARDING</strong><span>Changes apply to future handovers</span></div>
                  <div className="wh-concern-settings-list">{formConfig.concerns.map((concern) => {
                    return <div className="wh-config-concern-row" key={concern.id}>
                      <span className="wh-config-drag" aria-hidden="true">⋮⋮</span>
                      <WardClinicalIcon className="wh-config-concern-code" name={getWardConcernIconName(concern.label)} size={18} />
                      <span className="wh-config-concern-name">{concern.label}</span>
                      <label className="wh-config-switch"><span className="sr-only">Enable {concern.label}</span><input type="checkbox" checked={concern.enabled} onChange={(event) => setFormConfig((current) => ({ ...current, concerns: current.concerns.map((item) => item.id === concern.id ? { ...item, enabled: event.target.checked } : item) }))} /><span /></label>
                      <button className="wh-outline-mini" onClick={() => {
                        const nextLabel = window.prompt("Rename concern", concern.label)?.trim();
                        if (nextLabel) setFormConfig((current) => ({ ...current, concerns: current.concerns.map((item) => item.id === concern.id ? { ...item, label: nextLabel } : item) }));
                      }}>Rename</button>
                    </div>;
                  })}</div>
                  <button className="wh-button primary compact wh-add-config-button" onClick={() => {
                    const label = window.prompt("Name the new clinical or safeguarding concern")?.trim();
                    if (label) setFormConfig((current) => ({ ...current, concerns: [...current.concerns, { id: `concern-${Date.now()}`, label, enabled: true }] }));
                  }}><Plus size={14} /> Add concern</button>
                </article>
                <article className="wh-panel wh-admin-panel wh-settings-column wh-section-settings">
                  <div className="wh-admin-panel-heading"><strong>FORM SECTIONS</strong><span>Switch on / off</span></div>
                  <div className="wh-config-section-list">{formConfig.sections.map((item) => (
                    <label className="wh-config-section-row" key={item.id}>
                      <span>{item.label}</span>
                      <span className="wh-config-switch"><input type="checkbox" checked={item.enabled} onChange={(event) => setFormConfig((current) => ({ ...current, sections: current.sections.map((section) => section.id === item.id ? { ...section, enabled: event.target.checked } : section) }))} /><span /></span>
                    </label>
                  ))}</div>
                  <button className="wh-button primary compact wh-add-config-button" onClick={() => {
                    const label = window.prompt("Name the new handover form section")?.trim();
                    if (label) setFormConfig((current) => ({ ...current, sections: [...current.sections, { id: `section-${Date.now()}`, label, enabled: true }] }));
                  }}><Plus size={14} /> Add section</button>
                  <p className="wh-config-note">Sections switched off are hidden from nurses. Existing handovers keep the form version they were filled in on.</p>
                </article>
                <div className="wh-settings-side">
                  <article className="wh-panel wh-admin-panel wh-dropdown-settings">
                    <div className="wh-admin-panel-heading"><strong>DROPDOWN LISTS</strong></div>
                    <div className="wh-config-list-item"><strong>Shifts</strong><div className="wh-config-chips">{["Early", "Late", "Night"].map((shift) => <button key={shift} className={formConfig.shifts.includes(shift) ? "selected" : ""} onClick={() => setFormConfig((current) => ({ ...current, shifts: current.shifts.includes(shift) ? current.shifts.filter((item) => item !== shift) : [...current.shifts, shift] }))}>{shift}</button>)}</div></div>
                    <div className="wh-config-list-item"><strong>Wards</strong><div className="wh-config-chips">{(formConfig.wards || []).map((ward) => <span key={ward}>{ward}</span>)}{!formConfig.wards?.length && <span>None configured</span>}</div></div>
                    <div className="wh-config-list-item"><strong>NIC list</strong><span>{users.filter((item) => item.role === "NIC" && item.accountStatus === "ACTIVE").length} staff</span><button className="wh-outline-mini" onClick={() => setScreen("users")}>Edit</button></div>
                  </article>
                  <article className="wh-panel wh-admin-panel wh-version-history">
                    <div className="wh-admin-panel-heading"><strong>VERSION HISTORY</strong><span>Published versions</span></div>
                    <div className="wh-version-list">{formConfigHistory.map((entry) => <div key={entry.id}><b>v{entry.version || "—"}{Number(entry.version) === Number(publishedFormConfig.version) ? " (live)" : ""}</b><span>{formatDateTime(entry.changedAt)}</span><small>{entry.by}</small></div>)}{!formConfigHistory.length && <p className="wh-empty">No published changes recorded yet.</p>}</div>
                  </article>
                </div>
              </section>
            )}

            {screen === "reports" && ["Ward manager", "All access"].includes(role) && (
              <section className="wh-reports-page">
                <form className="wh-admin-filterbar wh-report-filterbar" onSubmit={(event) => event.preventDefault()}>
                  <label><span className="sr-only">Reporting period</span><select value={reportDays} onChange={(event) => setReportDays(Number(event.target.value))}><option value={7}>Period: Last 7 days</option><option value={30}>Period: Last 30 days</option><option value={90}>Period: Last 90 days</option><option value={365}>Period: Last 12 months</option></select></label>
                  <label><span className="sr-only">Handover shift</span><select value={reportShift} onChange={(event) => setReportShift(event.target.value)}><option value="All">Shift: All</option>{["Early", "Late", "Night", "Day shift", "Night shift"].map((item) => <option key={item} value={item}>Shift: {item}</option>)}</select></label>
                  <label><span className="sr-only">Report concern section</span><select value={reportSection} onChange={(event) => setReportSection(event.target.value)}><option value="All">Section: All</option>{formConfig.concerns.map((item) => <option key={item.id} value={item.label}>{item.label}</option>)}</select></label>
                  <span className="wh-report-filter-spacer" />
                  <button type="button" className="wh-button secondary compact" onClick={exportReportPdf}><Printer size={14} /> Export PDF</button>
                  <button type="button" className="wh-button primary compact" onClick={exportReportExcel}><Download size={14} /> Export Excel</button>
                </form>
                <div className="wh-report-summary-grid">
                  <article className="wh-report-summary-card green"><span>COMPLETION RATE</span><strong>{report?.summary?.completionRate ?? 0}%</strong><small>{report?.summary?.signedOff ?? 0} of {report?.summary?.totalHandovers ?? 0} handovers signed off</small></article>
                  <article className="wh-report-summary-card amber"><span>INCIDENTS (DATIX)</span><strong>{report?.summary?.incidents ?? 0}</strong><small>Last {reportDays} days</small></article>
                  <article className="wh-report-summary-card blue"><span>COMPLAINTS</span><strong>{report?.summary?.complaints ?? 0}</strong><small>Last {reportDays} days</small></article>
                  <article className="wh-report-summary-card blue"><span>AVG. PATIENTS / SHIFT</span><strong>{report?.summary?.averagePatientsPerShift ?? 0}</strong><small>Recorded average · Ward 3D</small></article>
                  <article className="wh-report-summary-card green"><span>OCCUPANCY</span><strong>{report?.summary?.occupancyRate ?? 0}%</strong><small>Based on recorded patient and empty-bed counts</small></article>
                </div>
                <div className="wh-report-chart-grid">
                  <div className="wh-report-left-column">
                    <article className="wh-panel wh-admin-panel wh-report-chart-card">
                      <div className="wh-admin-panel-heading"><strong>MOST FREQUENT CONCERNS</strong><span>Patient identifiers excluded</span></div>
                      <div className="wh-report-category-list">{(report?.concernCounts || []).slice(0, 7).map(({ label, count }) => {
                        const max = Math.max(...(report?.concernCounts || []).map((item) => item.count), 1);
                        return <div className="wh-report-category-row" key={label}><strong>{label}</strong><span><i style={{ width: `${Math.max((count / max) * 100, 4)}%` }} /></span><b>{count}</b></div>;
                      })}{!report?.concernCounts?.length && <div className="wh-empty">{loadingScreen ? "Loading aggregate data…" : "No concern data for this period."}</div>}</div>
                    </article>
                    <article className="wh-panel wh-admin-panel wh-report-chart-card">
                      <div className="wh-admin-panel-heading"><strong>DATIX INCIDENTS BY CATEGORY</strong><span>Last {reportDays} days</span></div>
                      <div className="wh-report-category-list">{(report?.incidentCategories || []).slice(0, 5).map(({ label, count }) => {
                        const max = Math.max(...(report?.incidentCategories || []).map((item) => item.count), 1);
                        return <div className="wh-report-category-row" key={label}><strong>{label}</strong><span><i style={{ width: `${Math.max((count / max) * 100, 4)}%` }} /></span><b>{count}</b></div>;
                      })}{!report?.incidentCategories?.length && <div className="wh-empty">No Datix incident references recorded for this period.</div>}</div>
                    </article>
                  </div>
                  <article className="wh-panel wh-admin-panel wh-report-weekly-card">
                    <div className="wh-admin-panel-heading"><strong>HANDOVER COMPLETION BY WEEK</strong></div>
                    <div className="wh-report-weekly-chart">{(report?.weeklyCompletion || []).map((week) => {
                      const rate = week.total ? Math.round((week.completed / week.total) * 100) : 0;
                      return <div className="wh-report-week-column" key={week.week}><strong>{rate}%</strong><span><i style={{ height: `${Math.max(rate, 2)}%` }} /></span><small>{new Date(`${week.week}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</small></div>;
                    })}{!report?.weeklyCompletion?.length && <div className="wh-empty">No handover data for this period.</div>}</div>
                  </article>
                </div>
                <p className="wh-privacy-caption"><LockKeyhole size={14} /> Aggregated trends only · no patient-level details are included in reports or exports.</p>
              </section>
            )}

            {screen === "audit" && isAdmin && (
              <section className="wh-audit-page">
                <form className="wh-admin-filterbar wh-audit-filterbar" onSubmit={(event) => { event.preventDefault(); setAuditPage(1); setAuditFilters(auditFiltersDraft); }}>
                  <label className="wh-audit-search"><span className="sr-only">Search audit log</span><input placeholder="Search by user, action or record…" value={auditFiltersDraft.search} onChange={(event) => setAuditFiltersDraft((current) => ({ ...current, search: event.target.value }))} /></label>
                  <label><span className="sr-only">Filter by action</span><select value={auditFiltersDraft.action} onChange={(event) => setAuditFiltersDraft((current) => ({ ...current, action: event.target.value }))}><option value="All">Action: All</option>{auditActions.map((action) => <option key={action} value={action}>{action}</option>)}</select></label>
                  <label><span className="sr-only">Filter by user</span><select value={auditFiltersDraft.user} onChange={(event) => setAuditFiltersDraft((current) => ({ ...current, user: event.target.value }))}><option value="All">User: All</option>{auditUsers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label><span className="sr-only">Audit period</span><select value={auditFiltersDraft.days} onChange={(event) => setAuditFiltersDraft((current) => ({ ...current, days: Number(event.target.value) }))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 12 months</option></select></label>
                  <button type="button" className="wh-button secondary compact" onClick={downloadAuditLog} disabled={role === "IG auditor"}><Download size={14} /> Export log</button>
                </form>
                <article className="wh-panel wh-admin-panel wh-audit-panel">
                  <div className="wh-admin-panel-heading"><strong>AUDIT LOG</strong><span>Read-only · cannot be edited or deleted</span></div>
                  <div className="wh-table-wrap"><table className="wh-table wh-audit-table">
                    <thead><tr><th>TIME</th><th>USER</th><th>ACTION</th><th>RECORD / DETAIL</th><th>DEVICE</th></tr></thead>
                    <tbody>{filteredAudit.map((event) => <tr key={event.id}><td>{new Date(event.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} {new Date(event.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</td><td>{shortName(event.actorName)}</td><td><span className={`wh-audit-action wh-audit-${event.action.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{event.action}</span></td><td>{event.recordLabel || event.recordId || "—"}</td><td>{event.device || "—"}</td></tr>)}</tbody>
                  </table>{!filteredAudit.length && <div className="wh-empty">No events match these filters.</div>}</div>
                  <footer className="wh-record-pagination"><span>Showing {auditPagination.total ? (auditPage - 1) * auditPagination.pageSize + 1 : 0}–{Math.min(auditPage * auditPagination.pageSize, auditPagination.total)} of {auditPagination.total} events</span><nav aria-label="Audit log pages">{getPageNumbers(auditPagination.pages, auditPage).map((page, index) => page === "ellipsis" ? <span key={`ellipsis-${index}`}>…</span> : <button key={page} className={auditPage === page ? "active" : ""} aria-current={auditPage === page ? "page" : undefined} onClick={() => setAuditPage(page)}>{page}</button>)}<button aria-label="Next page" disabled={auditPage >= auditPagination.pages} onClick={() => setAuditPage((page) => page + 1)}>›</button></nav></footer>
                </article>
              </section>
            )}

            {screen === "retention" && ["Admin", "All access"].includes(role) && (
              <section className="wh-retention-page">
                <article className="wh-panel wh-admin-panel wh-security-settings-card">
                  <div className="wh-admin-panel-heading"><strong>DATA PROTECTION &amp; SECURITY SETTINGS</strong><span>Changes are logged</span></div>
                  <div className="wh-security-settings-body">
                    <div className="wh-security-setting-row"><span><strong>Retention period</strong><small>Handover records are reviewed after the selected period, following Trust policy.</small></span><select aria-label="Retention period" disabled={role !== "Admin" && role !== "All access"} value={retentionSettings.retentionYears} onChange={(event) => setRetentionSettings((current) => ({ ...current, retentionYears: Number(event.target.value) }))}>{[1, 2, 3, 5, 6, 7, 8, 10, 12, 15, 20, 30].map((years) => <option value={years} key={years}>{years} years</option>)}</select></div>
                    <div className="wh-security-setting-row"><span><strong>Auto-lock after inactivity</strong><small>The screen locks and the user must sign in again.</small></span><select aria-label="Automatic session lock" disabled={role !== "Admin" && role !== "All access"} value={retentionSettings.autoLockMinutes} onChange={(event) => setRetentionSettings((current) => ({ ...current, autoLockMinutes: Number(event.target.value) }))}>{[2, 5, 10, 15, 30, 60].map((minutes) => <option value={minutes} key={minutes}>{minutes} minutes</option>)}</select></div>
                    <div className="wh-security-setting-row policy"><span><strong>Block screenshots / downloads</strong><small>Browser screenshots cannot be blocked here. Signed PDF downloads remain available to authorised users.</small></span><span className="wh-policy-status">Not enforced</span></div>
                    <div className="wh-security-setting-row policy"><span><strong>Exports hide patient identifiers</strong><small>Reports and exports contain aggregate counts only.</small></span><span className="wh-policy-status enabled">Enforced</span></div>
                    <div className="wh-security-setting-row policy"><span><strong>Require incoming NIC sign-off</strong><small>Two-person verification is required by the handover API.</small></span><span className="wh-policy-status enabled">Required</span></div>
                    <div className="wh-security-setting-row policy"><span><strong>Use bed numbers instead of names</strong><small>Clinical notes ask staff to use bed numbers; free text is not automatically screened.</small></span><span className="wh-policy-status">Staff guidance</span></div>
                    <div className="wh-security-setting-row policy"><span><strong>Two-factor sign-in for admins</strong><small>A Trust-approved second factor is not connected.</small></span><span className="wh-policy-status warning">Not configured</span></div>
                    <div className="wh-security-setting-row policy"><span><strong>Daily backup</strong><small>No backup scheduler is configured by this application.</small></span><span className="wh-policy-status">Not configured</span></div>
                    <div className="wh-security-setting-row policy"><span><strong>Email alert for unsigned handovers</strong><small>Email notification delivery is not configured.</small></span><span className="wh-policy-status">Not configured</span></div>
                  </div>
                </article>
                <div className="wh-retention-side">
                  <div className="wh-retention-summary-grid">
                    <article className="wh-panel wh-retention-summary-card"><span>RECORDS STORED</span><strong>{retentionSummary?.recordsStored ?? 0}</strong><small>Current Ward 3D handovers</small></article>
                    <article className="wh-panel wh-retention-summary-card"><span>AUTO-DELETE</span><strong>Off</strong><small>Manual governance review required</small></article>
                  </div>
                  <article className="wh-panel wh-admin-panel wh-review-queue">
                    <div className="wh-admin-panel-heading"><strong>RETENTION REVIEW QUEUE</strong><span>Policy threshold: {retentionSettings.retentionYears} years</span></div>
                    <table className="wh-table"><thead><tr><th>RECORDS BEFORE</th><th>COUNT</th><th>STATUS</th></tr></thead><tbody><tr><td>{retentionSummary?.oldestExpiredDate ? new Date(retentionSummary.oldestExpiredDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}</td><td>{retentionSummary?.deletionCount ?? 0}</td><td>{retentionSummary?.deletionCount ? "Review required" : "No records due"}</td></tr></tbody></table>
                  </article>
                  <article className="wh-panel wh-admin-panel wh-compliance-card">
                    <div className="wh-admin-panel-heading"><strong>COMPLIANCE</strong></div>
                    {[
                      ["DPIA approval", "Not recorded"],
                      ["IG sign-off", "Not recorded"],
                      ["Clinical safety case (DCB0129 / 0160)", "Not recorded"],
                      ["Data sharing agreement", "Not recorded"],
                      ["Penetration test", "Not recorded"],
                      ["Automated retention deletion", "Not configured"],
                    ].map(([label, status]) => <div className="wh-compliance-row" key={label}><span>{label}</span><span className="wh-policy-status warning">{status}</span></div>)}
                  </article>
                </div>
              </section>
            )}
          </div>
        </section>
      </div>

      {signoffDialogOpen && (
        <div className="wh-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSignoffDialogOpen(false); }}>
          <form
            className="wh-record-modal wh-signoff-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wh-signoff-dialog-title"
            onSubmit={(event) => { event.preventDefault(); finishHandover(); }}
          >
            <div className="wh-panel-heading between">
              <div><p className="wh-eyebrow">WARD 3D · SECOND-NIC CONFIRMATION</p><h2 id="wh-signoff-dialog-title">Confirm handover sign-off</h2></div>
              <button type="button" className="wh-icon-button" aria-label="Close confirmation" onClick={() => setSignoffDialogOpen(false)} disabled={saving}><X size={18} /></button>
            </div>
            <p className="wh-page-description">The incoming Nurse in Charge must verify using their own active Ward 3D account. Their password is used only for this confirmation.</p>
            <div className="wh-signoff-dialog-fields">
              <Field label="Incoming NIC email" type="email" value={form.incomingEmail} onChange={(event) => updateForm("incomingEmail", event.target.value)} disabled={saving} placeholder="incoming@gmail.com" />
              <Field label="Incoming NIC password" type="password" value={form.incomingPassword} onChange={(event) => updateForm("incomingPassword", event.target.value)} disabled={saving} placeholder="Their own password" />
            </div>
            <div className="wh-record-modal-actions">
              <button type="button" className="wh-button secondary" onClick={() => setSignoffDialogOpen(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="wh-button primary" disabled={saving || !form.incomingEmail || !form.incomingPassword}><CheckCircle2 size={16} /> {saving ? "Verifying…" : "Verify & sign off"}</button>
            </div>
          </form>
        </div>
      )}
      {selectedRecord && <div className="wh-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRecord(null); }}><section className="wh-record-modal" role="dialog" aria-modal="true" aria-labelledby="record-modal-title"><div className="wh-panel-heading between"><div><p className="wh-eyebrow">WARD 3D · READ ONLY</p><h2 id="record-modal-title">{new Date(selectedRecord.handoverDate).toLocaleDateString("en-GB")} · {selectedRecord.shift} shift</h2><p>{selectedRecord.nurseInChargeName || "Nurse in charge"} · {displayStatus(selectedRecord.status)}</p></div><button className="wh-icon-button" aria-label="Close record" onClick={() => setSelectedRecord(null)}><X size={18} /></button></div><div className="wh-record-modal-content"><div>{getHandoverDetailRows(selectedRecord.payload).map(({ label, value }, index) => <Fragment key={`${label}-${index}`}><strong>{label}</strong><span>{value}</span></Fragment>)}<strong>Sign-off</strong><span>{selectedRecord.signedOffAt ? `Signed ${formatDateTime(selectedRecord.signedOffAt)} · outgoing ${selectedRecord.outgoingNicName || "—"} · incoming ${selectedRecord.incomingNicName || "—"}` : "Not signed off"}</span></div></div><div className="wh-record-modal-actions"><button className="wh-button secondary" onClick={() => setSelectedRecord(null)}>Close</button>{selectedRecord.status === "SIGNED_OFF" && <button className="wh-button primary" onClick={() => downloadHandoverPdf(selectedRecord)}><Download size={16} /> Download signed PDF</button>}</div></section></div>}
      {toast && <div className="wh-toast" role="status"><CheckCircle2 size={18} />{toast}<button onClick={() => setToast("")} aria-label="Dismiss"><X size={15} /></button></div>}
    </main>
  );
}
