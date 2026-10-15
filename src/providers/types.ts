export interface SecFilingRecord {
  cik: string;
  accessionNumber: string;
  formType: string;
  filedAt: Date;
  filingUrl: string;
  companyName?: string;
  ticker?: string;
}

export interface MarketQuote {
  ticker: string;
  price: number;
  changePercent: number;
  volume: number;
  capturedAt: Date;
}

export interface SecProvider {
  findRecentRegistrationFilings(cik: string, since: Date): Promise<SecFilingRecord[]>;
}

export interface MarketDataProvider {
  getQuotes(tickers: string[]): Promise<MarketQuote[]>;
}
