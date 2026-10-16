import type { SecFilingRecord } from "@/providers/types";

const SEC_CURRENT_FILINGS_URL = "https://www.sec.gov/cgi-bin/browse-edgar";
const REGISTRATION_FORMS = ["S-1", "S-1/A", "F-1", "F-1/A"];

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function readTag(source: string, tag: string): string | undefined {
  const match = source.match(new RegExp("<" + tag + "\\b[^>]*>([\\s\\S]*?)<\\/\\s*" + tag + ">", "i"));
  return match?.[1] ? decodeXml(match[1]).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : undefined;
}

function readAttribute(source: string, attribute: string): string | undefined {
  return source.match(new RegExp("\\b" + attribute + "=\"([^\"]+)\"", "i"))?.[1];
}

function parseEntries(xml: string, formType: string): SecFilingRecord[] {
  const entries = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)];
  const results: SecFilingRecord[] = [];

  for (const [, entry] of entries) {
    const title = readTag(entry, "title");
    const updated = readTag(entry, "updated") ?? readTag(entry, "published");
    const summary = readTag(entry, "summary");
    const accessionNumber = summary?.match(/(?:Accession Number|AccNo):\s*([0-9-]+)/i)?.[1];
    const cikMatch = title?.match(/\((\d{7,10})\)/);
    const linkAttributes = [...entry.matchAll(/<link\b([^>]*)\/?\s*>/gi)].map((match) => match[1]);
    const link = linkAttributes.find((attributes) => readAttribute(attributes, "rel") === "alternate") ?? linkAttributes[0];
    const href = link && readAttribute(link, "href");
    const filedAt = updated ? new Date(updated) : undefined;
    const companyName = title?.replace(/\s*\(\d{7,10}\).*$/, "").replace(/\s+\((Filer|Filed by|Subject)\).*$/i, "").trim();

    if (!title || !cikMatch || !accessionNumber || !href || !filedAt || Number.isNaN(filedAt.getTime()) || !companyName) continue;
    results.push({
      cik: cikMatch[1].padStart(10, "0"),
      accessionNumber,
      formType,
      filedAt,
      companyName,
      filingUrl: new URL(href, "https://www.sec.gov").toString(),
    });
  }

  return results;
}

export class SecLatestFilingsProvider {
  constructor(private readonly userAgent: string) {
    if (!userAgent.trim() || userAgent.includes("example.com")) {
      throw new Error("Set SEC_USER_AGENT to a descriptive value with a monitored contact address.");
    }
  }

  async findRecentRegistrationFilings(since: Date): Promise<SecFilingRecord[]> {
    const results: SecFilingRecord[] = [];

    for (const formType of REGISTRATION_FORMS) {
      const query = new URLSearchParams({
        action: "getcurrent",
        CIK: "",
        type: formType,
        company: "",
        dateb: "",
        owner: "include",
        start: "0",
        count: "100",
        output: "atom",
      });
      const response = await fetch(SEC_CURRENT_FILINGS_URL + "?" + query, {
        headers: { "User-Agent": this.userAgent, Accept: "application/atom+xml" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("SEC latest filings request for " + formType + " failed with status " + response.status + ".");
      const xml = await response.text();
      results.push(...parseEntries(xml, formType).filter((filing) => filing.filedAt >= since));
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const uniqueFilings = new Map(results.map((filing) => [filing.accessionNumber, filing]));
    return [...uniqueFilings.values()].sort((left, right) => right.filedAt.getTime() - left.filedAt.getTime());
  }
}
