"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, HeartPulse } from "lucide-react";

export default function RequestAccessPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const passwordRules = [
    { label: "12+ characters", passed: password.length >= 12 },
    { label: "Upper & lower case", passed: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "A number", passed: /\d/.test(password) },
    { label: "A symbol", passed: /[^A-Za-z0-9]/.test(password) },
  ];

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/ward/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          staffNumber: formData.get("staffNumber"),
          email,
          password,
          confirmPassword,
          trainingCompleted: formData.get("trainingCompleted") === "on",
          confidentialityAccepted: formData.get("confidentialityAccepted") === "on",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create your account.");
      setSubmitted(true);
      setPassword("");
      setConfirmPassword("");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wh-auth-page">
      <aside className="wh-auth-visual">
        <div className="wh-auth-trust"><HeartPulse size={21} /><span><strong>Barts Health</strong><small>NHS Trust · Ward 3D</small></span></div>
        <div className="wh-auth-title"><h1>3D NURSE IN CHARGE</h1><h2>Safety Briefing &amp; Handover</h2><p>Create your account to join the Ward 3D team. Your account is activated immediately.</p><div className="wh-wecare-mini">{["W", "E", "C", "A", "R", "E"].map((item, index) => <span key={index}>{item}</span>)}</div></div>
        <small className="wh-auth-credit">Created by Theresa Nkansah · WECARE values</small>
      </aside>

      <section className="wh-auth-form-shell">
        <div className="wh-auth-form">
            <div className="wh-auth-steps"><span /><span /><span /></div>
            {submitted ? (
              <div className="wh-auth-success">
                <CheckCircle2 size={44} />
                <h2>Account created</h2>
                <p>Your account is active now. You can sign in immediately.</p>
                <Link href="/sign-in" className="wh-auth-submit">Return to sign in</Link>
              </div>
            ) : (
              <>
                <p className="wh-auth-kicker">CREATE ACCOUNT</p>
                <h2 className="wh-auth-heading">Create your account</h2>
                <p className="wh-auth-intro">Use your email address and create an account for immediate Ward staff access.</p>
                <form className="wh-auth-fields" onSubmit={handleSubmit}>
                  <div className="wh-auth-grid">
                    <label>Full name
                      <input name="name" required autoComplete="name" placeholder="As on your Trust ID" />
                    </label>
                    <label>Staff number
                      <input name="staffNumber" required placeholder="e.g. 123456" />
                    </label>
                  </div>
                  <label>Email address
                    <input type="email" name="email" required autoComplete="email" placeholder="name@gmail.com" />
                  </label>
                  <label>Ward
                    <input value="Ward 3D" disabled />
                  </label>
                  <div className="wh-auth-grid">
                    <label>Create password
                      <span className="wh-password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="At least 12 characters" required /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button></span>
                    </label>
                    <label>Confirm password
                      <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="Re-enter password" required />
                    </label>
                  </div>
                  <div className="wh-password-rules">{passwordRules.map((rule) => <span className={rule.passed ? "passed" : ""} key={rule.label}>{rule.label}</span>)}</div>
                  <label className="wh-auth-checkbox"><input type="checkbox" name="trainingCompleted" required /><span>I have completed Trust information governance (IG) training.</span></label>
                  <label className="wh-auth-checkbox"><input type="checkbox" name="confidentialityAccepted" required /><span>I will keep patient information confidential and follow the Trust acceptable use policy.</span></label>
                  {error && <p role="alert" className="wh-auth-error">{error}</p>}
                  <button type="submit" className="wh-auth-submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
                </form>
                <p className="wh-auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p>
              </>
            )}
        </div>
      </section>
    </main>
  );
}
