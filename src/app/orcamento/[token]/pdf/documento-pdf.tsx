// O orçamento em PDF (folha A4), montado no servidor com a biblioteca @react-pdf/renderer.
// Não é HTML: usa blocos próprios da biblioteca (Document, Page, View, Text, Image),
// com estilos parecidos com CSS. Mantenha o visual alinhado com a página pública.

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const AZUL = "#1e3a8a"; // a cor de destaque do sistema
const CINZA = "#6b7280";
const LINHA = "#e5e7eb";

const e = StyleSheet.create({
  pagina: { paddingTop: 40, paddingHorizontal: 44, paddingBottom: 60, fontFamily: "Helvetica", fontSize: 10.5, color: "#111827" },
  topo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: LINHA },
  empresa: { flexDirection: "row", alignItems: "center", gap: 12, maxWidth: 320 },
  logo: { width: 52, height: 52, objectFit: "contain" },
  empresaNome: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  cinza: { color: CINZA },
  rotulo: { fontSize: 8, color: CINZA, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 3 },
  numero: { fontSize: 20, fontFamily: "Helvetica-Bold", textAlign: "right" },
  dados: { flexDirection: "row", marginTop: 20, marginBottom: 22, gap: 24 },
  forte: { fontFamily: "Helvetica-Bold" },
  tabelaCab: { flexDirection: "row", backgroundColor: "#f3f4f6", paddingVertical: 7, paddingHorizontal: 8 },
  tabelaLinha: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: LINHA },
  colDesc: { flex: 1, paddingRight: 8 },
  colQtd: { width: 70, textAlign: "right" },
  colUnit: { width: 85, textAlign: "right" },
  colTotal: { width: 85, textAlign: "right" },
  totalCaixa: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginLeft: "auto", width: 240, backgroundColor: AZUL, color: "#ffffff", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 6 },
  totalValor: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  bloco: { marginTop: 20 },
  blocoTitulo: { fontFamily: "Helvetica-Bold", marginBottom: 3 },
  rodape: { position: "absolute", bottom: 28, left: 44, right: 44, fontSize: 8, color: CINZA, textAlign: "center", borderTopWidth: 1, borderTopColor: LINHA, paddingTop: 8 },
});

export type DadosPdf = {
  numero: number;
  data: string;
  validoAte: string;
  vencido: boolean;
  empresa: { nome: string; telefone: string; logo: Buffer | null; condicaoPagamento: string | null };
  cliente: { nome: string; telefone: string };
  itens: { descricao: string; quantidade: string; unitario: string; subtotal: string }[];
  total: string;
  observacao: string | null;
};

export function DocumentoPdf({ d }: { d: DadosPdf }) {
  return (
    <Document title={`Orçamento nº ${d.numero} · ${d.empresa.nome}`} author={d.empresa.nome}>
      <Page size="A4" style={e.pagina}>
        {/* Empresa e número */}
        <View style={e.topo}>
          <View style={e.empresa}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do PDF não tem "alt" */}
            {d.empresa.logo && <Image src={d.empresa.logo} style={e.logo} />}
            <View>
              <Text style={e.empresaNome}>{d.empresa.nome}</Text>
              {d.empresa.telefone ? <Text style={e.cinza}>{d.empresa.telefone}</Text> : null}
            </View>
          </View>
          <View>
            <Text style={[e.rotulo, { textAlign: "right" }]}>Orçamento</Text>
            <Text style={e.numero}>Nº {d.numero}</Text>
          </View>
        </View>

        {/* Data, validade e cliente */}
        <View style={e.dados}>
          <View>
            <Text style={e.rotulo}>Data</Text>
            <Text style={e.forte}>{d.data}</Text>
          </View>
          <View>
            <Text style={e.rotulo}>Válido até</Text>
            <Text style={[e.forte, d.vencido ? { color: "#b91c1c" } : {}]}>
              {d.validoAte}
              {d.vencido ? " (vencido)" : ""}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={e.rotulo}>Cliente</Text>
            <Text style={e.forte}>{d.cliente.nome}</Text>
            {d.cliente.telefone ? <Text style={e.cinza}>{d.cliente.telefone}</Text> : null}
          </View>
        </View>

        {/* Itens */}
        <View style={e.tabelaCab}>
          <Text style={[e.colDesc, e.rotulo, { marginBottom: 0 }]}>Descrição</Text>
          <Text style={[e.colQtd, e.rotulo, { marginBottom: 0 }]}>Qtd</Text>
          <Text style={[e.colUnit, e.rotulo, { marginBottom: 0 }]}>Valor unit.</Text>
          <Text style={[e.colTotal, e.rotulo, { marginBottom: 0 }]}>Total</Text>
        </View>
        {d.itens.map((item, i) => (
          <View key={i} style={e.tabelaLinha} wrap={false}>
            <Text style={e.colDesc}>{item.descricao}</Text>
            <Text style={e.colQtd}>{item.quantidade}</Text>
            <Text style={e.colUnit}>{item.unitario}</Text>
            <Text style={[e.colTotal, e.forte]}>{item.subtotal}</Text>
          </View>
        ))}

        <View style={e.totalCaixa} wrap={false}>
          <Text>Total</Text>
          <Text style={e.totalValor}>{d.total}</Text>
        </View>

        {/* Condições */}
        {d.empresa.condicaoPagamento ? (
          <View style={e.bloco} wrap={false}>
            <Text style={e.blocoTitulo}>Condição de pagamento</Text>
            <Text>{d.empresa.condicaoPagamento}</Text>
          </View>
        ) : null}
        <View style={e.bloco} wrap={false}>
          <Text style={e.blocoTitulo}>Validade</Text>
          <Text>Este orçamento é válido até {d.validoAte}.</Text>
        </View>
        {d.observacao ? (
          <View style={e.bloco}>
            <Text style={e.blocoTitulo}>Observações</Text>
            <Text>{d.observacao}</Text>
          </View>
        ) : null}

        <Text
          style={e.rodape}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${d.empresa.nome}${d.empresa.telefone ? " · " + d.empresa.telefone : ""} · Orçamento nº ${d.numero}` +
            (totalPages > 1 ? ` · Página ${pageNumber} de ${totalPages}` : "")
          }
        />
      </Page>
    </Document>
  );
}
