import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { lerSessao } from "@/lib/sessao";

// A PORTA DE ENTRADA de toda página e toda ação que mexe em dados.
// Se não houver login válido, manda para /login.
// Se houver, devolve o empresaId, que TODA consulta ao banco deve usar no filtro.
//
// Regra: nunca confie num empresaId que venha do formulário ou da URL.
// Use sempre o que vem daqui.
//
// O cache() faz a consulta ao banco rodar uma vez só por carregamento de página,
// mesmo que várias partes da página chamem exigirSessao().
export const exigirSessao = cache(async () => {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");

  return {
    usuarioId: sessao.usuarioId,
    empresaId: sessao.empresaId,
    empresaNome: sessao.empresa.nome,
  };
});
