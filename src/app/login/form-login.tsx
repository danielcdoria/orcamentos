"use client";

// "use client" = este componente roda no navegador, porque precisa reagir enquanto a
// pessoa usa (mostrar erro, desativar o botão enquanto envia).

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "./actions";

const estadoInicial: EstadoLogin = {};

export function FormLogin() {
  const [estado, acao, enviando] = useActionState(entrar, estadoInicial);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={estado.email}
          className="rounded-lg border border-gray-300 px-3 py-3 text-base"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Senha</span>
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-lg border border-gray-300 px-3 py-3 text-base"
        />
      </label>

      {estado.erro && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-gray-900 px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
