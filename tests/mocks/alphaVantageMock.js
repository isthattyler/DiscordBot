// Mock CSV response from Alpha Vantage Earnings Calendar API
// Contains a mix of S&P 500, Nasdaq 100, and non-index tickers for filter testing

const mockCSVResponse = `symbol,name,reportDate,fiscalDateEnding,estimate,currency,timeOfTheDay
AAPL,Apple Inc,2026-04-22,2026-03-31,1.52,USD,post-market
MSFT,Microsoft Corporation,2026-04-23,2026-03-31,2.85,USD,post-market
GOOGL,Alphabet Inc,2026-04-24,2026-03-31,1.35,USD,post-market
AMZN,Amazon.com Inc,2026-04-25,2026-03-31,0.85,USD,post-market
NVDA,NVIDIA Corporation,2026-04-22,2026-03-31,5.25,USD,pre-market
TSLA,Tesla Inc,2026-04-23,2026-03-31,0.85,USD,post-market
META,Meta Platforms Inc,2026-04-24,2026-03-31,4.50,USD,post-market
NFLX,Netflix Inc,2026-04-22,2026-03-31,4.25,USD,pre-market
AMD,Advanced Micro Devices,2026-04-23,2026-03-31,0.95,USD,post-market
INTC,Intel Corporation,2026-04-24,2026-03-31,0.35,USD,post-market
JPM,JPMorgan Chase,2026-04-22,2026-03-31,4.10,USD,pre-market
BAC,Bank of America,2026-04-23,2026-03-31,0.85,USD,pre-market
WFC,Wells Fargo,2026-04-24,2026-03-31,1.25,USD,pre-market
GS,Goldman Sachs,2026-04-22,2026-03-31,8.50,USD,pre-market
MS,Morgan Stanley,2026-04-23,2026-03-31,1.75,USD,pre-market
JNJ,Johnson & Johnson,2026-04-22,2026-03-31,2.60,USD,pre-market
PFE,Pfizer Inc,2026-04-23,2026-03-31,0.95,USD,pre-market
MRK,Merck & Co,2026-04-24,2026-03-31,1.85,USD,pre-market
UNH,UnitedHealth Group,2026-04-22,2026-03-31,6.25,USD,pre-market
CVS,CVS Health,2026-04-23,2026-03-31,1.55,USD,pre-market
XYZ,Non-Index Company,2026-04-22,2026-03-31,0.50,USD,post-market
ABC,Another Non-Index,2026-04-23,2026-03-31,1.25,USD,pre-market
DEF,Third Non-Index,2026-04-24,2026-03-31,0.75,USD,post-market`;

// Parsed mock data for easier testing
const mockEarningsData = [
  { symbol: 'AAPL', name: 'Apple Inc', reportDate: '2026-04-22', estimate: '1.52', timeOfTheDay: 'post-market' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', reportDate: '2026-04-23', estimate: '2.85', timeOfTheDay: 'post-market' },
  { symbol: 'GOOGL', name: 'Alphabet Inc', reportDate: '2026-04-24', estimate: '1.35', timeOfTheDay: 'post-market' },
  { symbol: 'AMZN', name: 'Amazon.com Inc', reportDate: '2026-04-25', estimate: '0.85', timeOfTheDay: 'post-market' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', reportDate: '2026-04-22', estimate: '5.25', timeOfTheDay: 'pre-market' },
  { symbol: 'TSLA', name: 'Tesla Inc', reportDate: '2026-04-23', estimate: '0.85', timeOfTheDay: 'post-market' },
  { symbol: 'META', name: 'Meta Platforms Inc', reportDate: '2026-04-24', estimate: '4.50', timeOfTheDay: 'post-market' },
  { symbol: 'NFLX', name: 'Netflix Inc', reportDate: '2026-04-22', estimate: '4.25', timeOfTheDay: 'pre-market' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', reportDate: '2026-04-23', estimate: '0.95', timeOfTheDay: 'post-market' },
  { symbol: 'INTC', name: 'Intel Corporation', reportDate: '2026-04-24', estimate: '0.35', timeOfTheDay: 'post-market' },
  { symbol: 'JPM', name: 'JPMorgan Chase', reportDate: '2026-04-22', estimate: '4.10', timeOfTheDay: 'pre-market' },
  { symbol: 'BAC', name: 'Bank of America', reportDate: '2026-04-23', estimate: '0.85', timeOfTheDay: 'pre-market' },
  { symbol: 'WFC', name: 'Wells Fargo', reportDate: '2026-04-24', estimate: '1.25', timeOfTheDay: 'pre-market' },
  { symbol: 'GS', name: 'Goldman Sachs', reportDate: '2026-04-22', estimate: '8.50', timeOfTheDay: 'pre-market' },
  { symbol: 'MS', name: 'Morgan Stanley', reportDate: '2026-04-23', estimate: '1.75', timeOfTheDay: 'pre-market' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', reportDate: '2026-04-22', estimate: '2.60', timeOfTheDay: 'pre-market' },
  { symbol: 'PFE', name: 'Pfizer Inc', reportDate: '2026-04-23', estimate: '0.95', timeOfTheDay: 'pre-market' },
  { symbol: 'MRK', name: 'Merck & Co', reportDate: '2026-04-24', estimate: '1.85', timeOfTheDay: 'pre-market' },
  { symbol: 'UNH', name: 'UnitedHealth Group', reportDate: '2026-04-22', estimate: '6.25', timeOfTheDay: 'pre-market' },
  { symbol: 'CVS', name: 'CVS Health', reportDate: '2026-04-23', estimate: '1.55', timeOfTheDay: 'pre-market' },
  { symbol: 'XYZ', name: 'Non-Index Company', reportDate: '2026-04-22', estimate: '0.50', timeOfTheDay: 'post-market' },
  { symbol: 'ABC', name: 'Another Non-Index', reportDate: '2026-04-23', estimate: '1.25', timeOfTheDay: 'pre-market' },
  { symbol: 'DEF', name: 'Third Non-Index', reportDate: '2026-04-24', estimate: '0.75', timeOfTheDay: 'post-market' }
];

module.exports = {
  mockCSVResponse,
  mockEarningsData
};
