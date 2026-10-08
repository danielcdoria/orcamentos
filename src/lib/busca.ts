// Busca que ignora maiúsculas e acentos: "matitatere" acha "Matitaterê".
// Roda no servidor e no navegador (não usa banco nem nada do Node).

// "Matitaterê " -> "matitatere"
export function normalizar(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira os acentos que o NFD separou da letra
    .toLowerCase()
    .trim();
}

// Todas as palavras digitadas aparecem no texto, em qualquer ordem?
// "aguas lumiar" acha "Pousada Águas de Lumiar".
export function textoBate(texto: string | null | undefined, busca: string): boolean {
  const alvo = normalizar(texto);
  return normalizar(busca)
    .split(/\s+/)
    .every((palavra) => alvo.includes(palavra));
}

// O cliente bate com o que foi digitado? Procura no nome (sem acento) e, se a busca
// tiver números, nos dígitos do telefone: "99988" acha "(21) 99988-7766".
export function clienteBate(
  cliente: { nome: string; telefone?: string | null },
  busca: string,
): boolean {
  const termo = normalizar(busca);
  if (!termo) return true;
  if (textoBate(cliente.nome, termo)) return true;

  const digitos = busca.replace(/\D/g, "");
  // Só compara telefone se a busca for basicamente um número (evita "Pousada 2" bater por "2")
  if (digitos.length >= 3 && digitos.length >= termo.replace(/[\s()+-]/g, "").length) {
    return (cliente.telefone ?? "").replace(/\D/g, "").includes(digitos);
  }
  return false;
}
