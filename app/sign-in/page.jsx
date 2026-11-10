"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HeartPulse, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function SignInPage() {
  const router = useRouter();
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    router.replace(user.wardRole === "Super admin" ? "/super-admin" : "/");
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await signIn({ email, password });
      if (response.error || !response.user) throw new Error(response.error || "Unable to sign in.");
      router.replace(response.user.wardRole === "Super admin" ? "/super-admin" : "/");
    } catch (signInError) {
      setError(signInError.message || "Sign-in failed. Check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wh-auth-page">
      <aside className="wh-auth-visual">
        <div className="wh-auth-trust"><HeartPulse size={21} /><span><strong>Barts Health</strong><small>NHS Trust · Ward 3D</small></span></div>
        <div className="wh-auth-title">
          <h1>3D NURSE IN CHARGE</h1>
          <h2>Safety Briefing &amp; Handover</h2>
          <p>Start of shift briefing and handover for the nurse in charge, with every safety item in one place.</p>
          <div className="wh-wecare-mini">{["W", "E", "C", "A", "R", "E"].map((item, index) => <span key={index}>{item}</span>)}</div>
        </div>
        <small className="wh-auth-credit">WECARE · Ward 3D</small>
      </aside>

      <section className="wh-auth-form-shell">
        <div className="wh-auth-form wh-signin-form">
          <p className="wh-auth-kicker">WARD 3D · AUTHORISED STAFF</p>
          <h2 className="wh-auth-heading">Sign in</h2>
          <p className="wh-auth-intro">Use your account to open the Ward 3D handover.</p>
          <button type="button" className="wh-auth-submit wh-sso-button" onClick={() => setError("Single sign-on has not been configured for this deployment. Sign in with your email address and password.")}>
            <ShieldCheck size={17} /> Sign in with Trust account (single sign-on)
          </button>
          <div className="wh-auth-divider"><span>or sign in with email</span></div>
          <form className="wh-auth-fields" onSubmit={handleSubmit}>
            <label>Email address
              <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@gmail.com" required />
            </label>
            <label>Password
              <span className="wh-password-field"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button></span>
            </label>
            <div className="wh-auth-options">
              <label className="wh-auth-checkbox wh-keep-signed"><input type="checkbox" /><span>Keep me signed in on this tablet <small>Not recommended on shared ward devices</small></span></label>
              <button type="button" className="wh-auth-forgot" onClick={() => setError("Contact your ward administrator to reset your password.")}>Forgot password?</button>
            </div>
            {error && <p role="alert" className="wh-auth-error">{error}</p>}
            <button type="submit" className="wh-auth-submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
          </form>
          <p className="wh-auth-switch">New to the ward? <Link href="/request-access">Request access</Link></p>
          <p className="wh-auth-switch">Administrator setup? <Link href="/super-admin/signup">Super Admin signup</Link></p>
          <div className="wh-auth-notice"><span /><p><strong>Authorised staff only.</strong> Patient information is confidential. All activity on this system is recorded and monitored. Sign out when you leave the tablet.</p></div>
        </div>
      </section>
    </main>
  );
}
