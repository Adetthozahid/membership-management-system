"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f8f5ef", color: "#163b39", fontFamily: "system-ui, sans-serif" }}>
          <section role="alertdialog" aria-labelledby="global-warning-title" aria-describedby="global-warning-body" style={{ width: "100%", maxWidth: 680, border: "1px solid #eadfd2", borderRadius: 8, background: "#fff", padding: 32, textAlign: "center", boxShadow: "0 16px 42px rgba(80,58,38,0.08)" }}>
            <p style={{ margin: 0, color: "#c35433", fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" }}>Smart warning</p>
            <h1 id="global-warning-title" style={{ margin: "14px 0 0", fontSize: 32, lineHeight: 1.15 }}>Something needs attention</h1>
            <p id="global-warning-body" style={{ margin: "14px auto 0", maxWidth: 520, color: "#5d6b68", fontSize: 14, lineHeight: 1.7 }}>
              The app could not finish loading safely. Please try again. If the
              issue continues, contact the administrator with the page address.
            </p>
            <div style={{ marginTop: 28, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <button type="button" onClick={reset} style={{ height: 40, border: 0, borderRadius: 8, background: "#1f5a56", color: "#fff", padding: "0 18px", fontWeight: 700, cursor: "pointer" }}>Try again</button>
              <a href="/" style={{ height: 40, display: "inline-flex", alignItems: "center", border: "1px solid #d8ccc0", borderRadius: 8, color: "#163b39", padding: "0 18px", fontWeight: 700, textDecoration: "none" }}>Homepage</a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
