import "server-only";
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Transforma a senha num "hash": um resumo embaralhado que não dá para desfazer.
// No banco fica só o hash. No login, embaralhamos a senha digitada do mesmo jeito
// e comparamos os resultados. Usa o scrypt, que já vem no Node e é feito para ser
// lento e gastar memória: assim, quem roubar o banco demora MUITO para testar senhas.
//
// Formato guardado: "scrypt$<log2 N>$<r>$<p>$<sal>$<hash>"
//   ex.: "scrypt$17$8$1$a1b2...$c3d4..."
// Hashes antigos ("sal:hash", feitos com a configuração padrão do Node, mais fraca)
// continuam funcionando e são refeitos no formato forte no próximo login (precisaRefazer).

// Custo atual, conforme a recomendação da OWASP para scrypt: N = 2^17, r = 8, p = 1
// (cerca de 128 MB de memória por senha).
const LOG2_N = 17;
const R = 8;
const P = 1;
const TAMANHO = 64;

function scryptAsync(senha: string, sal: Buffer, tamanho: number, opcoes: ScryptOptions) {
  return new Promise<Buffer>((ok, erro) =>
    scrypt(senha, sal, tamanho, { ...opcoes, maxmem: 256 * 1024 * 1024 }, (e, chave) =>
      e ? erro(e) : ok(chave),
    ),
  );
}

export async function gerarHashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scryptAsync(senha, sal, TAMANHO, { N: 2 ** LOG2_N, r: R, p: P });
  return ["scrypt", LOG2_N, R, P, sal.toString("hex"), hash.toString("hex")].join("$");
}

function lerHash(guardado: string) {
  if (guardado.startsWith("scrypt$")) {
    const [, log2n, r, p, sal, hash] = guardado.split("$");
    return { N: 2 ** Number(log2n), r: Number(r), p: Number(p), sal, hash };
  }
  // formato antigo "sal:hash" (padrão do Node: N = 2^14, r = 8, p = 1)
  const [sal, hash] = guardado.split(":");
  return { N: 2 ** 14, r: 8, p: 1, sal, hash };
}

export async function conferirSenha(senha: string, guardado: string): Promise<boolean> {
  const { N, r, p, sal, hash } = lerHash(guardado);
  if (!sal || !hash) return false;
  const esperado = Buffer.from(hash, "hex");
  const calculado = await scryptAsync(senha, Buffer.from(sal, "hex"), esperado.length, { N, r, p });
  // timingSafeEqual compara sem "entregar" pela demora quantos caracteres bateram
  return timingSafeEqual(esperado, calculado);
}

// true se o hash foi feito com um custo menor que o atual (deve ser refeito no login).
export function precisaRefazer(guardado: string): boolean {
  const { N, r, p } = lerHash(guardado);
  return N < 2 ** LOG2_N || r < R || p < P;
}
