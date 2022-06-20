const path = require('path');
module.exports = {
  rootDir: __dirname,
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: './coverage/',
  collectCoverage: true,
  moduleNameMapper: require('jest-module-name-mapper').default(path.resolve(__dirname, 'tsconfig.json')),
  globals: {
    'ts-jest': {
      tsconfig: path.resolve(__dirname, 'tsconfig.json'),
      diagnostics: {
        ignoreCodes: ['TS151001'],
      },
    },
  },
  moduleFileExtensions: ['js', 'ts', 'd.ts'],
  setupFilesAfterEnv: ['./tests/setup.js'],
  testTimeout: 10000,
};
