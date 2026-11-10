"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LogOut, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function formatRequestedAt(value) {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SuperAdminPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [requests, setRequests] = useState([]);
  const [roles, setRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ward/access-requests");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load access requests.");
      setRequests(data.requests || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/sign-in");
      return;
    }
    if (user.wardRole !== "Super admin") {
      router.replace("/");
      return;
    }
    loadRequests();
  }, [authLoading, user, router, loadRequests]);

  async function decideRequest(accessRequest, decision) {
    const reason = decision === "DECLINE"
      ? window.prompt("Reason for declining this request:") || ""
      : "";
    if (decision === "DECLINE" && !reason.trim()) return;

    setBusyId(accessRequest.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/ward/access-requests/${accessRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reason,
          ...(decision === "APPROVE" ? { grantedRole: roles[accessRequest.id] || accessRequest.requestedRole } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to decide this request.");
      setRequests((current) => current.filter((item) => item.id !== accessRequest.id));
      setMessage(data.message);
    } catch (decisionError) {
      setError(decisionError.message);
    } finally {
      setBusyId("");
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (signOutError) {
      setError(signOutError.message || "Unable to sign out.");
    }
  }

  if (authLoading || !user || user.wardRole !== "Super admin") {
    return <main className="wh-app wh-super-admin-page"><p className="wh-super-admin-loading">Checking Super Admin access…</p></main>;
  }

  return (
    <main className="wh-app wh-super-admin-page">
      <header className="wh-topbar">
        <a className="wh-brand" href="/super-admin">
          <span className="wh-brand-mark"><ShieldCheck size={19} /></span>
          <span><strong>Super Admin</strong><small>Ward 3D access control</small></span>
        </a>
        <div className="wh-topbar-title">Access review</div>
        <div className="wh-topbar-tools">
          <span className="wh-user-chip"><ShieldCheck size={16} /><span><strong>{user.name}</strong><small>Super admin</small></span></span>
          <button className="wh-icon-button" onClick={handleSignOut} aria-label="Sign out"><LogOut size={17} /></button>
        </div>
      </header>

      <section className="wh-super-admin-content">
        <header className="wh-dashboard-header">
          <div>
            <h1>Access requests</h1>
            <p>Approve requests to create active Ward 3D accounts, or decline them.</p>
          </div>
          <div><button className="wh-button secondary compact" onClick={loadRequests} disabled={loading}><RefreshCw size={14} /> {loading ? "Refreshing…" : "Refresh"}</button></div>
        </header>

        <article className="wh-panel wh-admin-panel wh-super-admin-requests">
          <div className="wh-admin-panel-heading"><strong>PENDING REQUESTS</strong><span>{requests.length} waiting</span></div>
          {error && <p className="wh-auth-error" role="alert">{error}</p>}
          {message && <p className="wh-super-admin-success" role="status">{message}</p>}
          <div className="wh-table-wrap">
            <table className="wh-table wh-requests-table">
              <thead><tr><th>APPLICANT</th><th>ROLE REQUESTED</th><th>STATUS</th><th>DECISION</th></tr></thead>
              <tbody>{requests.map((accessRequest) => (
                <tr key={accessRequest.id}>
                  <td>
                    <strong>{accessRequest.name}</strong>
                    <small className="wh-table-sub">{accessRequest.email}</small>
                    <small className="wh-table-sub">Staff no. {accessRequest.staffNumber} · Ward {accessRequest.ward}</small>
                    <small className="wh-table-sub">Approver: {accessRequest.approverName}</small>
                    <small className="wh-table-sub">Requested {formatRequestedAt(accessRequest.requestedAt)}</small>
                  </td>
                  <td>
                    <span className={`wh-role-pill ${accessRequest.requestedRole.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{accessRequest.requestedRole}</span>
                    <select
                      aria-label={`Role to grant to ${accessRequest.name}`}
                      value={roles[accessRequest.id] || accessRequest.requestedRole}
                      onChange={(event) => setRoles((current) => ({ ...current, [accessRequest.id]: event.target.value }))}
                      disabled={busyId === accessRequest.id}
                    >
                      <option>Ward staff</option>
                      <option>NIC</option>
                      <option>Ward manager</option>
                      <option>All access</option>
                    </select>
                  </td>
                  <td><span className="wh-record-state pending">{accessRequest.status}</span></td>
                  <td>
                    <div className="wh-user-actions">
                      <button className="primary" disabled={busyId === accessRequest.id} onClick={() => decideRequest(accessRequest, "APPROVE")}>
                        <CheckCircle2 size={14} /> {busyId === accessRequest.id ? "Saving…" : "Approve"}
                      </button>
                      <button className="danger" disabled={busyId === accessRequest.id} onClick={() => decideRequest(accessRequest, "DECLINE")}>
                        <XCircle size={14} /> Decline
                      </button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {!loading && requests.length === 0 && <div className="wh-empty">There are no pending access requests.</div>}
            {loading && <div className="wh-empty">Loading access requests…</div>}
          </div>
        </article>
      </section>
    </main>
  );
}
