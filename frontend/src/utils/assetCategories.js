/**
 * Asset type -> sub-category (exchange) options.
 * Used for filtering and form dropdowns.
 */
export const ASSET_TYPE_CATEGORIES = {
  Stock: [
    { value: 'US', label: 'US Stocks' },
    { value: 'HK', label: 'HK Stocks' },
    { value: 'AShare', label: 'A-Share (China)' },
  ],
  Fund: [
    { value: 'Domestic', label: 'Domestic' },
    { value: 'International', label: 'International' },
  ],
  Crypto: [{ value: 'Spot', label: 'Spot' }],
  Gold: [{ value: 'Spot', label: 'Spot' }],
  Bond: [
    { value: 'Government', label: 'Government' },
    { value: 'Corporate', label: 'Corporate' },
  ],
  Forex: [
    { value: 'Major', label: 'Major' },
    { value: 'Cross', label: 'Cross' },
  ],
  Custom: [{ value: 'Other', label: 'Other' }],
};

export const ASSET_TYPES = [
  'Stock',
  'Fund',
  'Crypto',
  'Gold',
  'Bond',
  'Forex',
  'Custom',
];
