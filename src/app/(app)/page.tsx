import { exigirSessao } from "@/lib/auth";

// Página inicial (provisória). No passo 4 ela vira a lista de orçamentos.
export default async function Inicio() {
  const { empresaNome } = await exigirSessao();

  return (
    <div>
      <h1 className="text-xl font-bold">Olá, {empresaNome}!</h1>
      <p className="mt-2 text-gray-600">Login funcionando. As telas chegam no próximo passo.</p>
    </div>
  );
}
