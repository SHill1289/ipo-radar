import type { SecFilingRecord, SecProvider } from "@/providers/types";

const SEC_ORIGIN = "https://data.sec.gov";
const REGISTRATION_FORMS = new Set(["S-1", "S-1/A", "F-1", "F-1/A"]);

export class SecSubmissionsProvider implements SecProvider {
  constructor(private readonly userAgent: string) {
    if (!userAgent.trim() || userAgent.includes("example.com")) {
      throw new Error("Set SEC_USER_AGENT to a descriptive value with a monitored contact address.");
    }
  }

  async findRecentRegistrationFilings(cik: string, since: Date): Promise<SecFilingRecord[]> {
    const normalizedCik = cik.replace(/\D/g, "").padStart(10, "0");
    if (!/^\d{10}$/.test(normalizedCik)) throw new Error("A valid SEC CIK is required.");
    const response = await fetch(`${SEC_ORIGIN}/submissions/CIK${normalizedCik}.json`, {
      headers: { "User-Agent": this.userAgent, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`SEC submissions request failed with status ${response.status}.`);
    const payload = await response.json() as {
      cik: string;
      name: string;
      filings: { recent: Record<string, string[]> };
    };
    const recent = payload.filings.recent;
    const results: SecFilingRecord[] = [];
    for (let index = 0; index < (recent.form?.length ?? 0); index += 1) {
      const formType = recent.form[index];
      const filedAt = new Date(recent.filingDate[index]);
      if (!REGISTRATION_FORMS.has(formType) || filedAt < since) continue;
      const accessionNumber = recent.accessionNumber[index];
      results.push({ cik: payload.cik.padStart(10, "0"), accessionNumber, formType, filedAt, companyName: payload.name, filingUrl: `https://www.sec.gov/Archives/edgar/data/${Number(payload.cik)}/${accessionNumber.replaceAll("-", "")}/${recent.primaryDocument[index]}` });
    }
    return results;
  }
}
