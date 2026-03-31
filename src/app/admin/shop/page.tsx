"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BG = "#070B18"; const GOLD = "#D4A017"; const GOLD_LIGHT = "#FFE082";
const LABEL = "#A08030"; const MUTED = "#7A6018"; const GREEN = "#25D366";

export default function AdminShopPage() {
  const router = useRouter();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/shop/produtos")
      .then(r => r.json())
      .then(d => setProdutos(d.produtos || []))
      .finally(() => setLoading(false));
  }, []);

  async function excluirProduto(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}" permanentemente? Esta ação não pode ser desfeita.`)) return;
    await fetch(`/api/admin/shop/produtos/${id}`, { method: "DELETE" });
    setProdutos(prev => prev.filter(p => p.id !== id));
  }

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <button onClick={() => router.push("/admin")} style={{ fontSize: 11, color: LABEL, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.1em" }}>← ADMIN</button>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.3rem", color: GOLD_LIGHT, letterSpacing: "0.2em", marginTop: 6 }}>JENNIFER SHOP</h1>
            <p style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>Produtos cadastrados</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => router.push("/admin/shop/vendas")}
              style={{ padding: "12px 20px", borderRadius: 12, border: `1px solid ${GREEN}`, background: "rgba(37,211,102,0.08)", color: GREEN, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
              📊 VENDAS
            </button>
            <button onClick={() => router.push("/admin/shop/saques")}
              style={{ padding: "12px 20px", borderRadius: 12, border: `1px solid #FFE082`, background: "rgba(255,224,130,0.08)", color: "#FFE082", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
              💸 SAQUES
            </button>
            <button onClick={() => router.push("/admin/shop/novo")}
              style={{ padding: "12px 20px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, #A07010, ${GOLD})`, color: "#0A0808", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
              + NOVO PRODUTO
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ color: MUTED, textAlign: "center", marginTop: 40 }}>carregando...</p>
        ) : produtos.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 60 }}>
            <p style={{ color: MUTED, fontSize: 14 }}>Nenhum produto cadastrado ainda.</p>
            <button onClick={() => router.push("/admin/shop/novo")} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 12, border: `1px solid ${GOLD}`, background: "transparent", color: GOLD, cursor: "pointer" }}>
              Cadastrar primeiro produto
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {produtos.map((p: any) => (
              <div key={p.id} style={{
                background: "rgba(212,160,23,0.05)", border: `1px solid rgba(212,160,23,0.2)`,
                borderRadius: 14, padding: "16px 20px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: GOLD_LIGHT, fontWeight: 600, fontSize: "0.95rem" }}>{p.nome}</p>
                    <p style={{ color: LABEL, fontSize: 12, marginTop: 4 }}>
                      R$ {p.precoVenda?.toFixed(2).replace(".", ",")} &nbsp;•&nbsp; {p.comissaoPorc}% comissão &nbsp;•&nbsp;
                      {p._count?.cliques || 0} cliques &nbsp;•&nbsp; {p._count?.vendas || 0} vendas
                    </p>
                    <p style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>/shop/{p.slug}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => window.open(`/shop/${p.slug}`, "_blank")}
                      style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid rgba(37,211,102,0.4)`, background: "rgba(37,211,102,0.08)", color: GREEN, fontSize: 11, cursor: "pointer" }}>
                      VER PÁGINA
                    </button>
                    <button onClick={() => router.push(`/admin/shop/${p.id}`)}
                      style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid rgba(212,160,23,0.3)`, background: "transparent", color: LABEL, fontSize: 11, cursor: "pointer" }}>
                      EDITAR
                    </button>
                    <button onClick={() => excluirProduto(p.id, p.nome)}
                      style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "rgba(192,57,43,0.15)", color: "#c0392b", fontSize: 11, cursor: "pointer" }}>
                      EXCLUIR
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
