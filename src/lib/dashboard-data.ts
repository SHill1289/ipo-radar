export type DashboardFiling = {
  id: string;
  companyName: string | null;
  cik: string;
  formType: string;
  filedAt: Date;
  filingUrl: string;
};

export type DashboardData = {
  status: "connected" | "unconfigured" | "error";
  filings: DashboardFiling[];
  filingCount: number;
  companyCount: number;
  upcomingCount: number;
  latestRun: { status: string; finishedAt: Date | null; recordsRead: number; metadata: unknown } | null;
};

const emptyDashboard = (status: DashboardData["status"]): DashboardData => ({
  status,
  filings: [],
  filingCount: 0,
  companyCount: 0,
  upcomingCount: 0,
  latestRun: null,
});

export async function getDashboardData(): Promise<DashboardData> {
  if (!process.env.DATABASE_URL) return emptyDashboard("unconfigured");

  try {
    const [{ db }, schema, operators] = await Promise.all([
      import("@/db"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const now = new Date();

    const [filings, filingTotal, companyTotal, upcomingTotal, latestRuns] = await Promise.all([
      db.select({
        id: schema.secFilings.id,
        companyName: schema.companies.name,
        cik: schema.secFilings.cik,
        formType: schema.secFilings.formType,
        filedAt: schema.secFilings.filedAt,
        filingUrl: schema.secFilings.filingUrl,
      })
        .from(schema.secFilings)
        .leftJoin(schema.companies, operators.eq(schema.secFilings.companyId, schema.companies.id))
        .orderBy(operators.desc(schema.secFilings.filedAt))
        .limit(10),
      db.select({ value: operators.count() })
        .from(schema.secFilings)
        .where(operators.gte(schema.secFilings.filedAt, monthStart)),
      db.select({ value: operators.count() }).from(schema.companies),
      db.select({ value: operators.count() })
        .from(schema.offerings)
        .where(operators.and(
          operators.eq(schema.offerings.status, "upcoming"),
          operators.gte(schema.offerings.expectedDate, now),
        )),
      db.select({
        status: schema.ingestionRuns.status,
        finishedAt: schema.ingestionRuns.finishedAt,
        recordsRead: schema.ingestionRuns.recordsRead,
        metadata: schema.ingestionRuns.metadata,
      })
        .from(schema.ingestionRuns)
        .orderBy(operators.desc(schema.ingestionRuns.startedAt))
        .limit(1),
    ]);

    return {
      status: "connected",
      filings,
      filingCount: Number(filingTotal[0]?.value ?? 0),
      companyCount: Number(companyTotal[0]?.value ?? 0),
      upcomingCount: Number(upcomingTotal[0]?.value ?? 0),
      latestRun: latestRuns[0] ?? null,
    };
  } catch (error) {
    console.error("Unable to load IPO Radar dashboard data.", error);
    return emptyDashboard("error");
  }
}
