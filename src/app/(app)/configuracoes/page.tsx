import { LogOut } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estiloBotaoSecundario, estiloCartao, estiloTitulo } from "@/components/estilos";
import { sair } from "../actions";
import { FormEmpresa } from "./form-empresa";
import { FormCobranca } from "./form-cobranca";
import { Logo } from "./logo";

export default async function PaginaConfiguracoes() {
  const { empresaId } = await exigirSessao();
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } });

  return (
    <div className="flex flex-col gap-6">
      <h1 className={estiloTitulo}>Ajustes</h1>

      <section className={`${estiloCartao} flex flex-col gap-4 p-5`}>
        <div>
          <h2 className="text-lg font-semibold">Logo da empresa</h2>
          <p className="text-base text-gray-600">Aparece no topo dos orçamentos que o cliente recebe.</p>
        </div>
        <Logo logoUrl={empresa.logoUrl} />
      </section>

      <section className={`${estiloCartao} flex flex-col gap-4 p-5`}>
        <h2 className="text-lg font-semibold">Dados da empresa</h2>
        <FormEmpresa
          empresa={{
            nome: empresa.nome,
            telefone: empresa.telefone ?? "",
            condicaoPagamento: empresa.condicaoPagamento ?? "",
            diasValidade: String(empresa.diasValidade),
            mensagemEnvio: empresa.mensagemEnvio,
            chavePix: empresa.chavePix ?? "",
            nomeRecebedorPix: empresa.nomeRecebedorPix ?? "",
          }}
        />
      </section>

      <section className={`${estiloCartao} flex flex-col gap-4 p-5`}>
        <h2 className="text-lg font-semibold">Cobrança</h2>
        <FormCobranca
          cobranca={{
            prazoCobranca1: String(empresa.prazoCobranca1),
            prazoPerdido: String(empresa.prazoPerdido),
          }}
        />
      </section>

      <form action={sair}>
        <button type="submit" className={`${estiloBotaoSecundario} w-full`}>
          <LogOut className="size-5" aria-hidden />
          Sair do sistema
        </button>
      </form>
    </div>
  );
}
