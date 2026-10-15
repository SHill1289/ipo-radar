export type IpoStatus = "rumored" | "filed" | "upcoming" | "withdrawn" | "completed";

export interface IpoListing {
  company: string;
  ticker: string;
  exchange: string;
  industry: string;
  status: IpoStatus;
  expectedDate: string;
  priceRange: string;
  dealSize: string;
  change?: string;
}
