"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Redirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const s = searchParams?.get("s") || "";
    router.replace(`/prestadores${s ? `?servico=${encodeURIComponent(s)}` : ""}`);
  }, [router, searchParams]);
  return null;
}

export default function ServicesNewPage() {
  return (
    <Suspense fallback={null}>
      <Redirect />
    </Suspense>
  );
}
