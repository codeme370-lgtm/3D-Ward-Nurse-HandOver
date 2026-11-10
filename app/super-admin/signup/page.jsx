"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, HeartPulse } from "lucide-react";

export default function SuperAdminSignupPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/super-admin/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password,
          confirmPassword,
          signupSecret: formData.get("signupSecret"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to set up Super Admin.");
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
        <div className="wh-auth-title"><h1>SUPER ADMIN</h1><h2>Secure account setup</h2><p>Set up the one-time administrator account to review and decide ward access requests.</p></div>
        <small className="wh-auth-credit">Ward 3D · Access control</small>
      </aside>
      <section className="wh-auth-form-shell">
        <div className="wh-auth-form">
          {submitted ? (
            <div className="wh-auth-success">
              <CheckCircle2 size={44} />
              <h2>Setup complete</h2>
              <p>Use the regular sign-in page to access the Super Admin dashboard.</p>
              <Link href="/sign-in" className="wh-auth-submit">Go to sign in</Link>
            </div>
          ) : (
            <>
              <p className="wh-auth-kicker">ONE-TIME SETUP</p>
              <h2 className="wh-auth-heading">Super Admin signup</h2>
              <p className="wh-auth-intro">This setup requires the configured administrator email and deployment secret. Signup does not create an access request.</p>
              <form className="wh-auth-fields" onSubmit={handleSubmit}>
                <label>Full name<input name="name" required maxLength={120} autoComplete="name" /></label>
                <label>Administrator email<input name="email" required type="email" autoComplete="username" /></label>
                <label>Deployment setup secret<input name="signupSecret" required type="password" autoComplete="off" /></label>
                <label>Create password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={12} /></label>
                <label>Confirm password<input required type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={12} /></label>
                <p className="wh-auth-intro">Password: at least 12 characters, upper and lower case, a number and a symbol.</p>
                {error && <p role="alert" className="wh-auth-error">{error}</p>}
                <button type="submit" className="wh-auth-submit" disabled={busy}>{busy ? "Creating account…" : "Create Super Admin account"}</button>
              </form>
              <p className="wh-auth-switch">Already set up? <Link href="/sign-in">Sign in</Link></p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
