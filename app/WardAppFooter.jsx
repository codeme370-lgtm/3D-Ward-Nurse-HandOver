import Link from "next/link";

export default function WardAppFooter() {
  return (
    <footer className="wh-shared-footer">
      <div className="wh-shared-footer-main">
        <section className="wh-footer-about">
          <strong>Barts Health</strong>
          <span>NHS Trust · Ward 3D</span>
          <p>3D Nurse in Charge Safety Briefing &amp; Handover. One place for every safety item at the start of each shift.</p>
        </section>
        <section>
          <h2>Help &amp; support</h2>
          <ul>
            <li>User guide</li>
            <li>Contact the digital team</li>
            <li>Report a problem</li>
            <li><Link href="/request-access">Request access</Link></li>
          </ul>
        </section>
        <section>
          <h2>Policies</h2>
          <ul>
            <li>Privacy notice</li>
            <li>Information governance</li>
            <li>Acceptable use policy</li>
            <li>Accessibility statement</li>
          </ul>
        </section>
        <section className="wh-footer-values">
          <h2>Our WeCare values</h2>
          <div className="wh-wecare-letters" aria-label="WeCare values">
            {["W", "E", "C", "A", "R", "E"].map((letter, index) => <span key={`${letter}-${index}`}>{letter}</span>)}
          </div>
          <p>Welcoming · Engaging · Collaborative · Accountable · Respectful · Equitable</p>
          <div className="wh-footer-confidential"><strong>Confidential.</strong> Patient information. Authorised staff only. All activity is recorded.</div>
        </section>
      </div>
      <div className="wh-shared-footer-bottom">
        <span>© 2026 Barts Health NHS Trust · Created by Theresa Nkansah</span>
        <span className="wh-footer-status"><i aria-hidden="true" /> System status: all services running</span>
        <span>Version 1.0 (prototype)</span>
      </div>
    </footer>
  );
}
