"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (!d.isAdmin) {
          router.push("/login");
        } else {
          setAutorizado(true);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  if (!autorizado) {
    return (
      <main style={{ minHeight: "100vh", background: "#070B18", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(212,160,23,0.2)", borderTopColor: "#D4A017", animation: "spin 0.9s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </main>
    );
  }

  return <>{children}</>;
}
