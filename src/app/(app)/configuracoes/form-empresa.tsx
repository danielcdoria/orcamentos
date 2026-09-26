"use client";

import { useActionState, useState } from "react";
import { salvarEmpresa, type EstadoForm } from "./actions";
import { montarMensagem, VARIAVEIS_MENSAGEM } from "@/lib/mensagem";
import { estiloBotao, estiloCampo, estiloErro, estiloRotulo } from "@/components/estilos";

type Empresa = {
  nome: string;
  telefone: string;
  condicaoPagamento: string;
  diasValidade: string;
  mensagemEnvio: string;
};

export function FormEmpresa({ empresa }: { empresa: Empresa }) {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(salvarEmpresa, {});
  const v = estado.valores ?? empresa;
  // A mensagem é "controlada" (useState) para a prévia atualizar enquanto se digita.
  const [mensagem, setMensagem] = useState(v.mensagemEnvio);

  const exemplo = montarMensagem(mensagem, {
    cliente: "Maria",
    link: "https://…/orcamento/abc123",
    numero: "12",
    valor: "R$ 1.250,00",
    validade: "10/10/2026",
    empresa: v.nome || "Sua empresa",
  });

  return (
    <form action={acao} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1">
        <span className={estiloRotulo}>Nome da empresa *</span>
        <input name="nome" required maxLength={120} defaultValue={v.nome} className={estiloCampo} />
      </label>

      <label className="flex flex-col gap-1">
        <span className={estiloRotulo}>Telefone</span>
        <input
          name="telefone"
          type="tel"
          inputMode="tel"
          placeholder="(21) 99999-9999"
          defaultValue={v.telefone}
          className={estiloCampo}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={estiloRotulo}>Condição de pagamento</span>
        <textarea
          name="condicaoPagamento"
          rows={2}
          maxLength={500}
          placeholder="Ex.: 50% na aprovação e 50% na entrega. Pix ou cartão em até 3x."
          defaultValue={v.condicaoPagamento}
          className={estiloCampo}
        />
        <span className="text-xs text-gray-500">Aparece em todos os orçamentos.</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className={estiloRotulo}>Validade dos orçamentos (dias) *</span>
        <input
          name="diasValidade"
          type="number"
          inputMode="numeric"
          min={1}
          max={365}
          required
          defaultValue={v.diasValidade}
          className={`${estiloCampo} w-32`}
        />
        <span className="text-xs text-gray-500">Vale para os próximos orçamentos criados.</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className={estiloRotulo}>Mensagem de envio pelo WhatsApp *</span>
        <textarea
          name="mensagemEnvio"
          rows={3}
          maxLength={1000}
          required
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          className={estiloCampo}
        />
        <span className="text-xs text-gray-500">
          Palavras entre chaves são trocadas na hora de enviar:{" "}
          {Object.entries(VARIAVEIS_MENSAGEM).map(([chave, descricao], i) => (
            <span key={chave}>
              {i > 0 && ", "}
              <code className="rounded bg-gray-100 px-1">{`{${chave}}`}</code> = {descricao}
            </span>
          ))}
          .
        </span>
      </label>

      <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
        <p className="text-xs font-medium text-gray-500">Exemplo de como o cliente recebe:</p>
        <p className="mt-1 whitespace-pre-line">{exemplo}</p>
      </div>

      {estado.erro && <p role="alert" className={estiloErro}>{estado.erro}</p>}
      {estado.ok && (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          Configurações salvas.
        </p>
      )}

      <button type="submit" disabled={enviando} className={estiloBotao}>
        {enviando ? "Salvando..." : "Salvar configurações"}
      </button>
    </form>
  );
}
