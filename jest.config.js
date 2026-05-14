module.exports = {
  preset: 'jest-preset-angular',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'html', 'js', 'json'],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$'
      }
    ]
  },
  collectCoverageFrom: [
    'src/app/core/services/token.service.ts',
    'src/app/core/services/product.service.ts',
    'src/app/core/services/stock.service.ts',
    'src/app/core/services/supplier.service.ts',
    'src/app/core/services/warehouse.service.ts',
    'src/app/core/services/payment.service.ts',
    'src/app/core/services/order.service.ts',
    'src/app/core/services/report.service.ts',
    'src/app/core/services/alert.service.ts',
    'src/app/core/services/stock-movement.service.ts',
    'src/app/core/services/invoice.service.ts',
    'src/app/core/services/toast.service.ts',
    'src/app/core/guards/auth.guard.ts',
    'src/app/core/guards/role.guard.ts',
    'src/app/core/interceptors/auth.interceptor.ts',
    'src/app/core/interceptors/error.interceptor.ts',
    'src/app/shared/components/service-unavailable/service-unavailable.component.ts',
    'src/app/features/products/product-list.component.ts',
    'src/app/features/products/product-form.component.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'lcov', 'text-summary'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/environments/',
    '<rootDir>/src/main.ts',
    '\\.d\\.ts$'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
