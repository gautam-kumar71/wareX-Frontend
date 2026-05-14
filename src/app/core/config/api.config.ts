const runtimeConfig = window.__WAREX_CONFIG ?? {};
const defaultGateway = window.location.origin === 'null' ? '' : window.location.origin;

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export const API_CONFIG = {
  gateway: trimTrailingSlash(runtimeConfig.gatewayUrl?.trim() || defaultGateway),
  endpoints: {
    auth: '/api/v1/auth',
    purchaseOrders: '/api/v1/purchase-orders',
    suppliers: '/api/v1/suppliers',
    warehouses: '/api/v1/warehouses',
    stock: '/api/v1/stock',
    products: '/api/v1/products',
    inventory: '/api/v1/inventory',
    payments: '/api/v1/payments',
    invoices: '/api/v1/invoices',
    stockMovements: '/api/v1/stock-movements',
    alerts: '/api/v1/alerts',
    reports: '/api/v1/reports'
  },
  googleClientId: runtimeConfig.googleClientId?.trim() || '1088186009987-kiiaeng9ombpmg7gcot0viaruqgjfn2f.apps.googleusercontent.com'
};

export function getApiUrl(service: keyof typeof API_CONFIG.endpoints): string {
  return `${API_CONFIG.gateway}${API_CONFIG.endpoints[service]}`;
}
