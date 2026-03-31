/**
 * Utility to parse raw OCR text from shipping labels and extract meaningful data.
 * Optimized for Brazilian address formats.
 */

export const parseOCRResult = (text) => {
  if (!text) return null;

  // Clean text while preserving lines for better name detection
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  const cleanText = lines.join(' ');
  console.log("OCR_PARSING_CLEAN_TEXT:", cleanText);

  // 1. Extract Nome do Destinatário
  // Heuristic: Often follows "Destinatário:", "Dest:", "Para:", or is in the first 2 lines
  let nome = null;
  const destMatch = cleanText.match(/(?:Destinatário|Dest\.?|Para|Recebedor):?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]{5,40})(?:\s|[0-9]|$)/i);
  
  if (destMatch) {
    nome = destMatch[1].trim();
  } else if (lines.length > 0) {
    // Fallback: Use the first line if it looks like a name (all caps or camel case, no numbers)
    const firstLine = lines[0];
    if (!/\d/.test(firstLine) && firstLine.length > 4 && firstLine.length < 50) {
      nome = firstLine;
    } else if (lines.length > 1 && !/\d/.test(lines[1])) {
      nome = lines[1];
    }
  }

  // 2. Extract CEP (00.000-000, 00000-000, or 00000000)
  const cepMatch = cleanText.match(/\d{2}\.?\d{3}-?\d{3}/) || cleanText.match(/\d{5}-?\d{3}/);
  const cep = cepMatch ? cepMatch[0].replace(/\./g, '') : null;

  // 3. Extract Number
  const numeroMatch = cleanText.match(/(?:N[º°o]\.?|Número:?|No\.?)\s*(\d+)/i) || 
                      cleanText.match(/,\s*(\d+)\b/);
  const numero = numeroMatch ? numeroMatch[1] : null;

  // 4. Extract Street Name
  const streetMatch = cleanText.match(/(?:Rua|Avenida|Av\.?|Trav\.?|Travessa|Al\.?|Alameda|Pca\.?|Praça)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+)(?:,|\s+N[º°o]|\s+\d+|$)/i);
  let street = streetMatch ? streetMatch[1].trim() : null;

  // 5. Extract Tracking Code
  const trackingMatch = cleanText.match(/[A-Z]{2}\d{9}[A-Z]{0,2}/i) || 
                       cleanText.match(/\b\d{10,}\b/);
  const tracking = trackingMatch ? trackingMatch[0].toUpperCase() : null;

  return {
    nome_destinatario: nome || "Destinatário não identificado",
    endereco_completo: street || "Endereço não identificado",
    numero: numero || "S/N",
    cep: cep,
    codigo_rastreio: tracking,
    texto_original: text
  };
};

/**
 * Strict 7-Step Parser for manifestations from logistics apps.
 * Optimized for: Name -> Street -> BAIRRO -> City State -> Number -> Reference -> CEP
 */
export const parseDeliveryText = (rawSegment) => {
  if (!rawSegment) return null;

  // Cleanup: Normalize whitespace and remove noise like app buttons (Navegação/Telefone)
  const cleanSegment = rawSegment.replace(/Navega[cç][aã]o|Telefone/gi, '').trim();
  const segment = cleanSegment;
  const lines = segment.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return null;

  // 1. Nome: Primeira linha em destaque (Heurística: primeira linha relevante após tracking)
  // Se a primeira linha comecar com o tracking (mesmo que tenha lixo no final como '口'), pulamos ela.
  let currentIdx = 0;
  if (/^\s*\b(?:[A-Z]{2}\d{9}[A-Z]{0,2}|\d{13,15})\b/i.test(lines[currentIdx])) currentIdx++;
  const nome = lines[currentIdx] || "Destinatário Desconhecido";

  // Join the rest for regex extraction over lines
  const textAfterName = lines.slice(currentIdx + 1).join(' ');

  // 2-3. Logradouro e Bairro: Texto até o primeiro bloco em TUDO MAIÚSCULO
  // 4. Cidade/Estado: Sigla de 2 letras e o que vier entre Bairro e Estado
  // Ex: "Estrada do Campo Limpo PIRAJUSSARA São Paulo SP"
  const addressRegex = /(.*?)\s+([A-ZÀ-ÖØ-öø-ÿ\s]{4,20})\s+(.*?)\s+([A-Z]{2})\b/;
  const addrMatch = textAfterName.match(addressRegex);

  let logradouro = "Endereço não identificado";
  let bairro = "";
  let cidade = "";
  let estado = "";

  if (addrMatch) {
    logradouro = addrMatch[1].trim();
    bairro = addrMatch[2].trim();
    cidade = addrMatch[3].trim();
    estado = addrMatch[4].trim();
  }

  // 5. Número: Sequência numérica após Cidade/Estado
  const afterCityText = textAfterName.split(estado).slice(1).join(estado);
  const numeroMatch = afterCityText.match(/\b(\d{1,6})\b/);
  const numero = numeroMatch ? numeroMatch[1] : "S/N";

  // 7. CEP: Sequência final de exatamente 8 dígitos
  const cepMatch = segment.match(/\b(\d{8})\b/);
  const cep = cepMatch ? cepMatch[1] : null;

  // 6. Ponto de Referência: Entre o Número e o CEP
  let pontoReferencia = null;
  if (cep && numero) {
    const afterNumberText = afterCityText.split(numero).slice(1).join(numero);
    const refMatch = afterNumberText.match(new RegExp(`(.*?)\\s*${cep}`));
    if (refMatch && refMatch[1].trim().length > 3) {
      pontoReferencia = refMatch[1].trim();
    }
  }

  return {
    nome_destinatario: nome,
    endereco_completo: logradouro,
    numero: numero,
    bairro: bairro,
    cidade: cidade,
    estado: estado,
    cep: cep,
    ponto_referencia: pontoReferencia,
    codigo_rastreio: segment.match(/\b(?:[A-Z]{2}\d{9}[A-Z]{0,2}|\d{13,15})\b/i)?.[0] || null
  };
};

/**
 * Parses a bulk screenshot using the tracking number as a delimiter
 * and the new strict parser for each segment.
 */
export const parseBulkScreenshot = (text) => {
  if (!text) return [];

  // Match standard Brazilian tracking codes (e.g., BR123456789) or 15-digit IDs as card separators
  const trackingRegex = /\b(?:[A-Z]{2}\d{9}[A-Z]{0,2}|\d{13,15})\b/ig;
  const trackingMatches = Array.from(text.matchAll(trackingRegex));
  if (trackingMatches.length === 0) return [];

  const results = [];

  for (let i = 0; i < trackingMatches.length; i++) {
    const startIdx = trackingMatches[i].index;
    const endIdx = (i < trackingMatches.length - 1) ? trackingMatches[i+1].index : text.length;
    
    const segment = text.substring(startIdx, endIdx);
    const parsed = parseDeliveryText(segment);
    
    if (parsed) results.push(parsed);
  }

  return results;
};
