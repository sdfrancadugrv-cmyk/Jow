"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Cadastro unificado com login — tudo pelo WhatsApp
export default function ProviderRegisterPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/provider/login"); }, [router]);
  return null;
}
