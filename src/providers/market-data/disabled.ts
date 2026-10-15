import type { MarketDataProvider, MarketQuote } from "@/providers/types";

export class DisabledMarketDataProvider implements MarketDataProvider {
  async getQuotes(_tickers: string[]): Promise<MarketQuote[]> {
    throw new Error("No market data provider is configured. Implement a licensed provider adapter before enabling quotes.");
  }
}
