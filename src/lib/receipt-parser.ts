/**
 * @fileOverview Parser de comprovantes Pix/débito (OCR local via Tesseract.js).
 *
 * Recebe o texto bruto extraído pelo OCR e aplica heurísticas para achar
 * valor, data, descrição e categoria. Nenhuma chamada de rede ou IA.
 */

export type ReceiptConfidence = 'alta' | 'media' | 'baixa';

export interface ParsedReceipt {
  valor: number;
  dataTransacao: string; // AAAA-MM-DD
  descricao: string;
  categoria: string;
  confianca: ReceiptConfidence;
}

export const RECEIPT_CATEGORIES = [
  'Moradia',
  'Alimentação',
  'Transporte',
  'Contas',
  'Lazer',
  'Saúde',
  'Compras',
  'Pet',
  'Cartão',
  'Outros',
] as const;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Moradia: [
    'aluguel', 'alug', 'condominio', 'condomínio', 'imovel', 'imóvel', 'iptu',
    'renovacao', 'portaria', 'predio', 'prédio', 'house', 'apartamento', 'casa',
  ],
  Alimentação: [
    'supermercado', 'mercado', 'feira', 'padaria', 'restaurante', 'lanchonete',
    'ifood', 'rappi', 'food', 'cafe', 'café', 'acougue', 'hortifruti', 'pizzaria',
    'burger', 'starbucks', 'mcdonald', 'mcdonalds', 'subway', 'kfc', 'bk',
    'lanche', 'almoço', 'almoco', 'jantar', 'bar ', 'restaurant', 'pizza',
  ],
  Transporte: [
    'uber', '99', '99pop', 'taxi', 'táxi', 'metro', 'metrô', 'onibus', 'ônibus',
    'gasolina', 'combustivel', 'combustível', 'etanol', 'diesel', 'ipiranga',
    'shell', 'petrobras', 'br mania', 'estacionamento', 'pedagio', 'pedágio',
    'uber Eats', 'moto', 'bilhete',
  ],
  Contas: [
    'luz', 'energia', 'enel', 'cpfl', 'agua', 'água', 'saneamento', 'internet',
    'vivo', 'claro', 'tim ', 'net ', 'telefone', 'celular', 'gas', 'gás', 'comgas',
    'boleto', 'conta', 'assinatura', 'streaming', 'netflix', 'spotify', 'youtube',
    'disney', 'amazon prime', 'apple', 'icloud',
  ],
  Lazer: [
    'cinema', 'cinemark', 'ingresso', 'show', 'teatro', 'teatro', 'clube',
    'bar ', 'balada', 'festa', 'passeio', 'parque', 'praia', 'viagem', 'hotel',
    'airbnb', 'booking', 'ticket', 'esporte', 'academia', 'personal',
  ],
  Saúde: [
    'farmacia', 'farmácia', 'drogaria', 'droga raia', 'drogariasil', 'medico',
    'médico', 'clinica', 'clínica', 'hospital', 'laboratorio', 'laboratório',
    'exame', 'consulta', 'dentista', 'unimed', 'amil', 'bradesco saude',
    'psicologo', 'psicólogo', 'terapia', 'plano de saude',
  ],
  Compras: [
    'amazon', 'shopee', 'mercado livre', 'magalu', 'magazine', 'renner', 'cea',
    'riachuelo', 'zara', 'nike', 'adidas', 'shopping', 'loja', 'roupa', 'calcado',
    'tênis', 'tenis', 'presente', 'bazar',
  ],
  Pet: [
    'pet shop', 'petshop', 'petisco', 'racao', 'ração', 'veterinario', 'veterinário',
    'clínica veterinária', 'banho e tosa', 'tosa', 'henna',
  ],
  Cartão: [
    'cartao', 'cartão', 'credito', 'crédito', 'fatura', 'visa', 'mastercard',
    'elo', 'amex', 'diners', 'hipercard', 'pagar.me', 'nubank', 'itaucard',
    'bradescard', 'santander',
  ],
};

/** Remove acentos e normaliza para busca por palavra-chave. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Converte "1.234,56" ou "R$ 1.234,56" ou "1234.56" em número. */
export function parseBrazilianNumber(raw: string): number | null {
  let s = raw.replace(/r\s*\$/gi, '').replace(/\s/g, '').trim();
  if (!s) return null;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    // Formato BR: ponto é separador de milhar, vírgula é decimal.
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    s = s.replace(',', '.');
  } else if (hasDot) {
    // Só com ponto: assume decimal (ex.: "1234.56").
    const parts = s.split('.');
    // "1.234" é milhar em BR, mas "1234.56" é decimal.
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
      s = s.replace('.', '');
    }
  }

  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;

  const value = Number(s);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Extrai todos os candidatos numéricos monetários de uma linha. */
function findAmountCandidates(line: string): number[] {
  const matches = line.match(/\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d{1,3}(?:,\d{3})*\.\d{2}/g);
  if (!matches) return [];
  return matches
    .map(parseBrazilianNumber)
    .filter((v): v is number => v !== null);
}

const VALUE_HINTS = [
  'valor', 'valores', 'pagamento', 'pago', 'transferencia', 'transferência',
  'total', 'quantia', 'importancia', 'importância', 'debitado', 'debitou',
  'enviado', 'enviou', 'paguei',
];

const NEGATIVE_HINTS = [
  'saldo', 'limite', 'disponivel', 'disponível', 'cnpj', 'cpf', 'fone', 'telefone',
  'conta', 'agencia', 'agência', 'banco', 'autenticacao', 'autenticação', 'codigo',
  'código', 'endereco', 'endereço', 'protocolo', 'e2e id', 'txid', 'devolvido',
  'extorno', 'parcela anterior',
];

/**
 * Procura o valor da transação no texto do OCR.
 * Prioriza números em linhas com palavras como "valor"/"pagamento",
 * descartando linhas que mencionam saldo, limite ou identificadores.
 */
export function extractAmount(text: string): { valor: number; confianca: ReceiptConfidence } {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const scored: { valor: number; score: number }[] = [];

  for (const line of lines) {
    const norm = normalize(line);
    const candidates = findAmountCandidates(line);
    if (candidates.length === 0) continue;

    const hasValueHint = VALUE_HINTS.some((h) => norm.includes(h));
    const hasNegative = NEGATIVE_HINTS.some((h) => norm.includes(h));

    for (const valor of candidates) {
      // Valores absurdos (>= 1 milhão) costumam ser CNPJ, saldo ou erro de OCR.
      if (valor >= 1_000_000) continue;

      let score = 0;
      if (hasValueHint) score += 10;
      if (hasNegative) score -= 8;
      if (/r\s*\$/i.test(line)) score += 3;
      // Prefere o maior valor quando há vários na mesma linha sem dica.
      if (!hasValueHint) score += valor / 100_000;

      scored.push({ valor, score });
    }
  }

  if (scored.length === 0) {
    return { valor: 0, confianca: 'baixa' };
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const isSecondBestClose = scored[1] && Math.abs(scored[1].score - best.score) < 1;

  return {
    valor: best.valor,
    confianca: best.score >= 8 && !isSecondBestClose ? 'alta' : 'media',
  };
}

/** Procura a primeira data em formato dd/mm/aaaa ou dd/mm/aa. */
export function extractDate(text: string): string | null {
  const match = text.match(/\b(\d{2})\/(\d{2})\/(\d{2,4})\b/);
  if (!match) return null;

  const [, dayStr, monthStr, yearStr] = match;
  let year = Number(yearStr);
  if (yearStr.length === 2) {
    year = year < 50 ? 2000 + year : 1900 + year;
  }

  const day = Number(dayStr);
  const month = Number(monthStr);

  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const DESCRIPTION_HINTS = [
  'para', 'destinatario', 'destinatário', 'recebedor', 'beneficiario',
  'beneficiário', 'estabelecimento', 'nome', 'favorecido',
];

const BOILERPLATE = [
  'pix', 'comprovante', 'transacao', 'transação', 'pagamento', 'realizado',
  'banco', 'bradesco', 'itau', 'itú', 'nubank', 'inter', 'santander', 'bb',
  'caixa', 'receita federal', 'cpf', 'cnpj', 'autenticacao', 'autenticação',
  'codigo', 'código', 'protocolo', 'finalizacao', 'finalização', 'data',
  'hora', 'e2e', 'txid', 'endereco', 'endereço',
];

/** Tenta montar uma descrição curta a partir do nome do recebedor/estabelecimento. */
export function extractDescription(text: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const norm = normalize(line);
    const hint = DESCRIPTION_HINTS.find((h) => norm.includes(h));
    if (!hint) continue;

    const afterColon = line.includes(':') ? line.split(':').pop()! : null;
    const candidate = (afterColon ?? line.split(hint)[1] ?? '').trim();

    const cleaned = candidate.replace(/[^A-Za-zÀ-ÿ0-9 .&-]/g, '').trim();
    if (cleaned.length >= 3 && cleaned.length <= 60) return cleaned;
  }

  // Fallback: primeira linha "textual" que não seja número nem boilerplate.
  for (const line of lines) {
    if (findAmountCandidates(line).length > 0) continue;
    if (line.length < 3 || line.length > 60) continue;

    const norm = normalize(line);
    if (BOILERPLATE.some((b) => norm === b || norm.startsWith(b))) continue;
    if (norm.match(/^\d+$/)) continue;

    return line.replace(/[^A-Za-zÀ-ÿ0-9 .&-]/g, '').trim();
  }

  return 'Despesa via comprovante';
}

/** Escolhe a categoria com mais palavras-chave encontradas. */
export function guessCategory(text: string): string {
  const norm = normalize(text);

  let best = 'Outros';
  let bestHits = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let hits = 0;
    for (const keyword of keywords) {
      if (norm.includes(normalize(keyword))) hits += 1;
    }
    if (hits > bestHits) {
      bestHits = hits;
      best = category;
    }
  }

  return best;
}

/** Pipeline completo: texto bruto do OCR -> dados da despesa. */
export function parseReceiptText(ocrText: string): ParsedReceipt {
  const { valor, confianca } = extractAmount(ocrText);
  const dataTransacao = extractDate(ocrText) ?? new Date().toISOString().slice(0, 10);
  const descricao = extractDescription(ocrText);
  const categoria = guessCategory(`${descricao} ${ocrText}`);

  return {
    valor,
    dataTransacao,
    descricao,
    categoria,
    confianca: valor > 0 ? confianca : 'baixa',
  };
}