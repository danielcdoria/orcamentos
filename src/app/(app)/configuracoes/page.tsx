import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FormEmpresa } from "./form-empresa";
import { Logo } from "./logo";

export default async function PaginaConfiguracoes() {
  const { empresaId } = await exigirSessao();
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } });

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Logo</h2>
        <p className="text-sm text-gray-600">Aparece no topo dos orçamentos. PNG, JPG ou WebP.</p>
        <Logo logoUrl={empresa.logoUrl} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Dados da empresa</h2>
        <FormEmpresa
          empresa={{
            nome: empresa.nome,
            telefone: empresa.telefone ?? "",
            condicaoPagamento: empresa.condicaoPagamento ?? "",
            diasValidade: String(empresa.diasValidade),
            mensagemEnvio: empresa.mensagemEnvio,
          }}
        />
      </section>
    </div>
  );
}
