import type { IpoStatus } from "@/lib/types";

export type DataState = "connected" | "unconfigured" | "error";

export type CompanySummary = {
  id: string;
  name: string;
  ticker: string | null;
  exchange: string | null;
  industry: string | null;
  secCik: string | null;
  latestFiling: {
    formType: string;
    filedAt: Date;
    filingUrl: string;
  } | null;
};

export type CompanyOffering = {
  id: string;
  status: IpoStatus;
  filingDate: Date | null;
  expectedDate: Date | null;
  pricedDate: Date | null;
  sharesOffered: string | null;
  priceLow: string | null;
  priceHigh: string | null;
  finalPrice: string | null;
  dealSize: string | null;
  leadUnderwriters: string[] | null;
  source: string;
  sourceType: string | null;
  sourceUrl: string | null;
  sourceCheckedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
};

export type CompanyFiling = {
  id: string;
  formType: string;
  filedAt: Date;
  filingUrl: string;
  accessionNumber: string;
};

export type CompanyProfile = {
  id: string;
  name: string;
  ticker: string | null;
  exchange: string | null;
  industry: string | null;
  description: string | null;
  website: string | null;
  secCik: string | null;
};

export type CalendarOffering = {
  id: string;
  companyId: string;
  companyName: string;
  ticker: string | null;
  secCik: string | null;
  status: IpoStatus;
  expectedDate: Date;
  priceLow: string | null;
  priceHigh: string | null;
  dealSize: string | null;
};

export type CompanyDirectoryData = {
  state: DataState;
  companies: CompanySummary[];
};

export type CompanyDetailData = {
  state: DataState;
  company: CompanyProfile | null;
  offerings: CompanyOffering[];
  filings: CompanyFiling[];
};

const emptyDirectory = (state: DataState): CompanyDirectoryData => ({ state, companies: [] });
const emptyDetail = (state: DataState): CompanyDetailData => ({ state, company: null, offerings: [], filings: [] });

export async function getCompanyDirectory(search = ""): Promise<CompanyDirectoryData> {
  if (!process.env.DATABASE_URL) return emptyDirectory("unconfigured");

  try {
    const [{ db }, schema, operators] = await Promise.all([
      import("@/db"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);
    const [companyRows, filingRows] = await Promise.all([
      db.select({
        id: schema.companies.id,
        name: schema.companies.name,
        ticker: schema.companies.ticker,
        exchange: schema.companies.exchange,
        industry: schema.companies.industry,
        secCik: schema.companies.secCik,
      }).from(schema.companies).orderBy(schema.companies.name).limit(500),
      db.select({
        companyId: schema.secFilings.companyId,
        formType: schema.secFilings.formType,
        filedAt: schema.secFilings.filedAt,
        filingUrl: schema.secFilings.filingUrl,
      }).from(schema.secFilings)
        .where(operators.isNotNull(schema.secFilings.companyId))
        .orderBy(operators.desc(schema.secFilings.filedAt))
        .limit(2000),
    ]);
    const latestByCompany = new Map<string, (typeof filingRows)[number]>();
    for (const filing of filingRows) {
      if (filing.companyId && !latestByCompany.has(filing.companyId)) latestByCompany.set(filing.companyId, filing);
    }
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const companies = companyRows
      .filter((company) => !normalizedSearch || [
        company.name,
        company.ticker ?? "",
        company.secCik ?? "",
        company.industry ?? "",
      ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch)))
      .map((company) => ({
        ...company,
        latestFiling: latestByCompany.get(company.id) ?? null,
      }));

    return { state: "connected", companies };
  } catch (error) {
    console.error("Unable to load IPO Radar companies.", error);
    return emptyDirectory("error");
  }
}

export async function getCompanyDetail(slug: string): Promise<CompanyDetailData> {
  if (!process.env.DATABASE_URL) return emptyDetail("unconfigured");

  try {
    const [{ db }, schema, operators] = await Promise.all([
      import("@/db"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);
    const companyCondition = slug.startsWith("cik-")
      ? operators.eq(schema.companies.secCik, slug.slice(4))
      : operators.eq(schema.companies.id, slug);
    const [companyRows] = await Promise.all([
      db.select({
        id: schema.companies.id,
        name: schema.companies.name,
        ticker: schema.companies.ticker,
        exchange: schema.companies.exchange,
        industry: schema.companies.industry,
        description: schema.companies.description,
        website: schema.companies.website,
        secCik: schema.companies.secCik,
      }).from(schema.companies).where(companyCondition).limit(1),
    ]);
    const company = companyRows[0];
    if (!company) return { state: "connected", company: null, offerings: [], filings: [] };

    const [offerings, filings] = await Promise.all([
      db.select({
        id: schema.offerings.id,
        status: schema.offerings.status,
        filingDate: schema.offerings.filingDate,
        expectedDate: schema.offerings.expectedDate,
        pricedDate: schema.offerings.pricedDate,
        sharesOffered: schema.offerings.sharesOffered,
        priceLow: schema.offerings.priceLow,
        priceHigh: schema.offerings.priceHigh,
        finalPrice: schema.offerings.finalPrice,
        dealSize: schema.offerings.dealSize,
        leadUnderwriters: schema.offerings.leadUnderwriters,
        source: schema.offerings.source,
        sourceType: schema.offerings.sourceType,
        sourceUrl: schema.offerings.sourceUrl,
        sourceCheckedAt: schema.offerings.sourceCheckedAt,
        reviewedAt: schema.offerings.reviewedAt,
        reviewedBy: schema.offerings.reviewedBy,
      }).from(schema.offerings)
        .where(operators.eq(schema.offerings.companyId, company.id))
        .orderBy(operators.desc(schema.offerings.updatedAt))
        .limit(20),
      db.select({
        id: schema.secFilings.id,
        formType: schema.secFilings.formType,
        filedAt: schema.secFilings.filedAt,
        filingUrl: schema.secFilings.filingUrl,
        accessionNumber: schema.secFilings.accessionNumber,
      }).from(schema.secFilings)
        .where(operators.eq(schema.secFilings.companyId, company.id))
        .orderBy(operators.desc(schema.secFilings.filedAt))
        .limit(100),
    ]);

    return { state: "connected", company, offerings, filings };
  } catch (error) {
    console.error("Unable to load IPO Radar company profile.", error);
    return emptyDetail("error");
  }
}

export async function getCalendarOfferings(start: Date, end: Date): Promise<{ state: DataState; offerings: CalendarOffering[] }> {
  if (!process.env.DATABASE_URL) return { state: "unconfigured", offerings: [] };

  try {
    const [{ db }, schema, operators] = await Promise.all([
      import("@/db"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);
    const offerings = await db.select({
      id: schema.offerings.id,
      companyId: schema.companies.id,
      companyName: schema.companies.name,
      ticker: schema.companies.ticker,
      secCik: schema.companies.secCik,
      status: schema.offerings.status,
      expectedDate: schema.offerings.expectedDate,
      priceLow: schema.offerings.priceLow,
      priceHigh: schema.offerings.priceHigh,
      dealSize: schema.offerings.dealSize,
    }).from(schema.offerings)
      .innerJoin(schema.companies, operators.eq(schema.offerings.companyId, schema.companies.id))
      .where(operators.and(
        operators.gte(schema.offerings.expectedDate, start),
        operators.lt(schema.offerings.expectedDate, end),
        operators.ne(schema.offerings.status, "withdrawn"),
        operators.ne(schema.offerings.status, "completed"),
      ))
      .orderBy(schema.offerings.expectedDate)
      .limit(500);

    return { state: "connected", offerings: offerings.filter((offering) => offering.expectedDate !== null) as CalendarOffering[] };
  } catch (error) {
    console.error("Unable to load IPO Radar calendar.", error);
    return { state: "error", offerings: [] };
  }
}
