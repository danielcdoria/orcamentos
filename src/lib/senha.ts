import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Transforma a senha num "hash": um resumo embaralhado que não dá para desfazer.
// No banco fica só o hash. No login, embaralhamos a senha digitada do mesmo jeito
// e comparamos os resultados. Usa o scrypt, que já vem no Node e é feito para ser lento
// (assim, quem roubar o banco demora muito para testar senhas).

const scryptAsync = promisify(scrypt) as (
  senha: string,
  sal: Buffer,
  tamanho: number,
) => Promise<Buffer>;

const TAMANHO = 64;

// Formato guardado: "sal:hash", os dois em hexadecimal.
export async function gerarHashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scryptAsync(senha, sal, TAMANHO);
  return `${sal.toString("hex")}:${hash.toString("hex")}`;
}

export async function conferirSenha(senha: string, guardado: string): Promise<boolean> {
  const [salHex, hashHex] = guardado.split(":");
  if (!salHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, "hex");
  const calculado = await scryptAsync(senha, Buffer.from(salHex, "hex"), esperado.length);
  // timingSafeEqual compara sem "entregar" pela demora quantos caracteres bateram
  return timingSafeEqual(esperado, calculado);
}
