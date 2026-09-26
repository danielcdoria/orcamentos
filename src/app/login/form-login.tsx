"use client";

// "use client" = este componente roda no navegador, porque precisa reagir enquanto a
// pessoa usa (mostrar erro, mostrar "Entrando..." enquanto envia).

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "./actions";
import { estiloBotao, estiloCampo, estiloErro, estiloRotulo } from "@/components/estilos";

const estadoInicial: EstadoLogin = {};

export function FormLogin() {
  const [estado, acao, enviando] = useActionState(entrar, estadoInicial);

  return (
    <form action={acao} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className={estiloRotulo}>Email</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          defaultValue={estado.email}
          className={estiloCampo}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className={estiloRotulo}>Senha</span>
        <input name="senha" type="password" autoComplete="current-password" required className={estiloCampo} />
      </label>

      {estado.erro && <p role="alert" className={estiloErro}>{estado.erro}</p>}

      <button type="submit" disabled={enviando} className={`${estiloBotao} w-full text-lg`}>
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
