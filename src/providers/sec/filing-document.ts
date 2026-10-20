import type { SecFilingRecord } from "@/providers/types";

const MAX_DOCUMENT_BYTES = 1_000_000;
const SEC_ORIGIN = "https://www.sec.gov";
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export type ExtractedOfferingTerms = {
  documentUrl: string;
  isIpoCandidate: boolean;
  priceLow: string | null;
  priceHigh: string | null;
  sharesOffered: string | null;
  extractedFields: string[];
};

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, decimal: string) => decodeCodePoint(Number(decimal)))
    .replace(/&#x([\da-f]+);/gi, (_, hex: string) => decodeCodePoint(Number.parseInt(hex, 16)));
}

function decodeCodePoint(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : " ";
}

function filingIndexUrl(filing: SecFilingRecord) {
  const cik = filing.cik.replace(/\D/g, "");
  const accession = filing.accessionNumber;
  if (!/^\d{1,10}$/.test(cik) || !/^\d{10}-\d{2}-\d{6}$/.test(accession)) {
    throw new Error("SEC filing identifiers have an unsupported format.");
  }
  const accessionDirectory = accession.replaceAll("-", "");
  return new URL(
    `/Archives/edgar/data/${Number(cik)}/${accessionDirectory}/${accession}-index.htm`,
    SEC_ORIGIN,
  );
}

function toPlainText(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function primaryDocumentUrl(html: string, filing: SecFilingRecord, indexUrl: URL) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  for (const [, row] of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => toPlainText(match[1]));
    if (!cells.some((cell) => cell.toUpperCase() === filing.formType.toUpperCase())) continue;

    const href = [...row.matchAll(/\bhref\s*=\s*(["'])(.*?)\1/gi)]
      .map((match) => decodeHtml(match[2]))
      .find((value) => /\.html?$/i.test(new URL(value, indexUrl).pathname));
    if (!href) continue;

    const documentUrl = new URL(href, indexUrl);
    if (documentUrl.hostname !== "www.sec.gov" && documentUrl.hostname !== "sec.gov") {
      throw new Error("SEC registration document URL must use sec.gov.");
    }
    return documentUrl;
  }
  throw new Error("The SEC filing index did not list a primary registration document.");
}

function toText(html: string) {
  return decodeHtml(html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|ix:header)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/[\u00a0\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readDocumentPrefix(response: Response) {
  if (!response.body) return response.text();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  while (bytesRead < MAX_DOCUMENT_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = MAX_DOCUMENT_BYTES - bytesRead;
    const chunk = value.subarray(0, remaining);
    chunks.push(chunk);
    bytesRead += chunk.byteLength;
    if (chunk.byteLength < value.byteLength) break;
  }
  await reader.cancel();
  const bytes = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function parsePriceRange(text: string) {
  const range = /\$?\s*((?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?)\s*(?:to|through|[-–—])\s*\$?\s*((?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?)(?:\s+(?:per|a)\s+share)?/gi;
  for (const match of text.matchAll(range)) {
    const start = match.index ?? 0;
    const prefix = text.slice(Math.max(0, start - 180), start);
    const suffix = text.slice(start + match[0].length, start + match[0].length + 40);
    const hasPriceContext = /initial public offering price|price to public|public offering price|offering price|per share/i.test(prefix);
    const hasShareContext = /per share|a share/i.test(match[0] + suffix);
    const low = Number(match[1].replaceAll(",", ""));
    const high = Number(match[2].replaceAll(",", ""));
    if (hasPriceContext && hasShareContext && low > 0 && high >= low && high <= 100_000) {
      return { low: low.toFixed(2), high: high.toFixed(2) };
    }
  }
  return null;
}

function parseShares(text: string) {
  const patterns = [
    /\bwe are offering\s+(?:up to\s+)?([\d,]+)\s+(?:shares|ordinary shares)\b/i,
    /\b(?:shares|ordinary shares)\s+of (?:our )?(?:common stock|ordinary shares)\s+offered\s+([\d,]+)\b/i,
    /\bnumber of shares (?:being )?offered\s+([\d,]+)\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const shares = Number(match[1].replaceAll(",", ""));
      if (Number.isSafeInteger(shares) && shares > 0) return String(shares);
    }
  }
  return null;
}

export function extractOfferingTerms(html: string, documentUrl: string): ExtractedOfferingTerms {
  const coverText = toText(html).slice(0, 60_000);
  const price = parsePriceRange(coverText);
  const sharesOffered = parseShares(coverText);
  const isIpoCandidate = /\binitial public offering\b/i.test(coverText)
    || /\bwe are offering\b.{0,180}\b(?:shares|ordinary shares)\b/i.test(coverText);
  const extractedFields = [
    ...(price ? ["priceLow", "priceHigh"] : []),
    ...(sharesOffered ? ["sharesOffered"] : []),
  ];
  return {
    documentUrl,
    isIpoCandidate,
    priceLow: price?.low ?? null,
    priceHigh: price?.high ?? null,
    sharesOffered,
    extractedFields,
  };
}

export class SecFilingDocumentProvider {
  private lastRequestAt = 0;

  constructor(private readonly userAgent: string) {}

  private async request(url: URL, accept: string) {
    for (let attempt = 0; ; attempt += 1) {
      const wait = Math.max(0, 250 - (Date.now() - this.lastRequestAt));
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      this.lastRequestAt = Date.now();
      const response = await fetch(url, {
        headers: { "User-Agent": this.userAgent, Accept: accept },
        cache: "no-store",
      });
      if (!RETRYABLE_STATUSES.has(response.status) || attempt >= 2) return response;
      await response.body?.cancel();
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  async extractOfferingTerms(filing: SecFilingRecord): Promise<ExtractedOfferingTerms> {
    const indexUrl = filingIndexUrl(filing);
    const indexResponse = await this.request(indexUrl, "text/html");
    if (!indexResponse.ok) throw new Error("SEC filing index request failed with status " + indexResponse.status + ".");
    const documentUrl = primaryDocumentUrl(await indexResponse.text(), filing, indexUrl);
    const documentResponse = await this.request(documentUrl, "text/html");
    if (!documentResponse.ok) throw new Error("SEC registration document request failed with status " + documentResponse.status + ".");
    return extractOfferingTerms(await readDocumentPrefix(documentResponse), documentUrl.toString());
  }
}
