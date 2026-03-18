import { EXCHANGE_CURRENCY } from './assetCategories';
import { getCurrentRates } from './fxRates';

export const getCurrencyForExchange = (exchange) =>
  EXCHANGE_CURRENCY[exchange] || { code: 'USD', symbol: '$', label: 'USD' };

export const formatCurrency = (value, currencyCode = 'USD') => {
  const code = typeof currencyCode === 'string' && currencyCode ? currencyCode : 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value ?? 0);
  } catch {
    return `${code} ${Number(value ?? 0).toFixed(2)}`;
  }
};

export const formatCurrencyForExchange = (value, exchange) => {
  const { code } = getCurrencyForExchange(exchange);
  return formatCurrency(value, code);
};

export const convertToUSD = (value, exchange) => {
  const { code } = getCurrencyForExchange(exchange);
  const rate = getCurrentRates()[code] ?? 1.0;
  return value * rate;
};
