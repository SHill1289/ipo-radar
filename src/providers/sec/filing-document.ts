import type { SecFilingRecord } from "@/providers/types";

type FilingIndex = {
  directory?: { item?: Array<{ name?: string; type?: string }> };
};

const MAX_DOCUMENT_BYTES = 1_000_000;

export type ExtractedOfferingTerms = {
  documentUrl: string;
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

function filingDocumentUrl(filing: SecFilingRecord, index: FilingIndex) {
  const indexUrl = new URL(filing.filingUrl);
  if (indexUrl.hostname !== "www.sec.gov" && indexUrl.hostname !== "sec.gov") {
    throw new Error("SEC filing URL must use sec.gov.");
  }
  const jsonUrl = new URL(indexUrl);
  jsonUrl.pathname = jsonUrl.pathname.replace(/-index\.htm(l)?$/i, "-index.json");
  if (jsonUrl.pathname === indexUrl.pathname) throw new Error("SEC filing index URL has an unsupported format.");

  const documents = index.directory?.item ?? [];
  const primary = documents.find((item) => item.type?.toUpperCase() === filing.formType.toUpperCase() && /\.html?$/i.test(item.name ?? ""));
  if (!primary?.name) throw new Error("The SEC filing index did not list a primary registration document.");
  return new URL(encodeURIComponent(primary.name), indexUrl).toString();
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
  const extractedFields = [
    ...(price ? ["priceLow", "priceHigh"] : []),
    ...(sharesOffered ? ["sharesOffered"] : []),
  ];
  return {
    documentUrl,
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
    const wait = Math.max(0, 250 - (Date.now() - this.lastRequestAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    this.lastRequestAt = Date.now();
    return fetch(url, {
      headers: { "User-Agent": this.userAgent, Accept: accept },
      cache: "no-store",
    });
  }

  async extractOfferingTerms(filing: SecFilingRecord): Promise<ExtractedOfferingTerms> {
    const indexUrl = new URL(filing.filingUrl);
    if (indexUrl.hostname !== "www.sec.gov" && indexUrl.hostname !== "sec.gov") {
      throw new Error("SEC filing URL must use sec.gov.");
    }
    indexUrl.pathname = indexUrl.pathname.replace(/-index\.htm(l)?$/i, "-index.json");
    if (indexUrl.pathname === new URL(filing.filingUrl).pathname) throw new Error("SEC filing index URL has an unsupported format.");

    const indexResponse = await this.request(indexUrl, "application/json");
    if (!indexResponse.ok) throw new Error("SEC filing index request failed with status " + indexResponse.status + ".");
    const index = await indexResponse.json() as FilingIndex;
    const documentUrl = filingDocumentUrl(filing, index);
    const documentResponse = await this.request(new URL(documentUrl), "text/html");
    if (!documentResponse.ok) throw new Error("SEC registration document request failed with status " + documentResponse.status + ".");
    return extractOfferingTerms(await readDocumentPrefix(documentResponse), documentUrl);
  }
}
