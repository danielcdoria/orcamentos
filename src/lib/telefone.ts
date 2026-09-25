// Telefones brasileiros: limpar para o WhatsApp e formatar para mostrar.

// Deixa só os dígitos e resolve o código do país.
// "(21) 99999-8888" / "021 99999-8888" / "+55 21 99999-8888" -> "5521999998888"
// Devolve null se não der para montar um número completo (ex.: faltou o DDD).
export function telefoneParaWhatsApp(telefone: string | null | undefined): string | null {
  if (!telefone) return null;
  const digitos = telefone
    .replace(/\D/g, "") // tira parênteses, traços, espaços, "+"
    .replace(/^0+/, ""); // tira zeros de discagem: "021..." -> "21...", "0055..." -> "55..."

  // Já veio com o 55 do Brasil: 55 + DDD (2) + número (8 ou 9) = 12 ou 13 dígitos.
  // (Sem o 55 um número tem no máximo 11 dígitos, então não há confusão com o DDD 55.)
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
    return digitos;
  }

  // DDD + número (fixo com 8 dígitos ou celular com 9)
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;

  return null; // sem DDD ou número estranho
}

// "21999998888" -> "(21) 99999-8888"; se não reconhecer, devolve como foi digitado.
export function formatarTelefone(telefone: string | null | undefined): string {
  if (!telefone) return "";
  const numero = telefoneParaWhatsApp(telefone)?.slice(2); // sem o 55
  if (!numero) return telefone;
  const ddd = numero.slice(0, 2);
  const resto = numero.slice(2);
  const meio = resto.length === 9 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, meio)}-${resto.slice(meio)}`;
}
