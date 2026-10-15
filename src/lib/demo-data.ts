import type { IpoListing } from "./types";

export const listings: IpoListing[] = [
  { company: "Northstar AI", ticker: "NSTA", exchange: "NASDAQ", industry: "AI infrastructure", status: "filed", expectedDate: "2026-10-22", priceRange: "$28–$32", dealSize: "$750M" },
  { company: "Atlas Robotics", ticker: "ATLR", exchange: "NYSE", industry: "Industrial technology", status: "rumored", expectedDate: "2026-10-28", priceRange: "TBD", dealSize: "TBD" },
  { company: "Mosaic Health", ticker: "MOSH", exchange: "NYSE", industry: "Healthcare technology", status: "upcoming", expectedDate: "2026-11-04", priceRange: "$32–$36", dealSize: "$1.2B" },
  { company: "Harbor Cloud", ticker: "HBRD", exchange: "NASDAQ", industry: "Software", status: "filed", expectedDate: "2026-11-12", priceRange: "$22–$25", dealSize: "$600M" },
  { company: "Cedar Finance", ticker: "CEDR", exchange: "NASDAQ", industry: "Financial technology", status: "completed", expectedDate: "2026-09-18", priceRange: "$24", dealSize: "$864M", change: "+18.4%" },
  { company: "Fable Studio", ticker: "FABL", exchange: "NYSE", industry: "Software", status: "completed", expectedDate: "2026-09-09", priceRange: "$33", dealSize: "$1.1B", change: "+42.7%" },
];

export const upcomingListings = listings.filter((listing) => listing.status !== "completed" && listing.status !== "withdrawn");
