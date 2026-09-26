// Classes do Tailwind repetidas em várias telas, num lugar só.
// Mudar aqui muda o sistema todo. Regras: botões e campos com 48px de altura
// (dedo, não mouse), texto de 16px, azul "marca" só no botão principal.

export const estiloCampo =
  "min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-marca focus:ring-2 focus:ring-marca/20 focus:outline-none";

export const estiloRotulo = "text-base font-medium text-gray-800";

export const estiloDica = "text-sm text-gray-600";

// Botão principal: um por tela, o maior elemento.
export const estiloBotao =
  "flex min-h-12 items-center justify-center gap-2 rounded-xl bg-marca px-5 py-3 text-center text-base font-semibold text-white hover:bg-marca-escura disabled:opacity-60";

export const estiloBotaoSecundario =
  "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-center text-base font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-60";

export const estiloBotaoPerigo =
  "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-center text-base font-medium text-red-700 hover:bg-red-50 disabled:opacity-60";

export const estiloErro = "rounded-xl bg-red-50 px-4 py-3 text-base text-red-800";

export const estiloSucesso = "rounded-xl bg-green-50 px-4 py-3 text-base text-green-800";

export const estiloCartao = "rounded-2xl border border-gray-200 bg-white";

export const estiloTitulo = "text-2xl font-bold text-gray-900";
