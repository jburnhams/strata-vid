// Packages that ship ESM only (strata-react and what it imports). Jest runs CommonJS, so Babel
// compiles these too; everything else in node_modules is left alone.
const esmOnly = ['strata-react', 'react-router', '@remix-run', 'cookie-es', '@tanstack', 'pixelmatch'];

const baseConfig = {
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^.+/utils/workerUtils$': '<rootDir>/tests/utils/workerUtilsMock.js',
    '^.+\\.(css|less|scss|sass)$': '<rootDir>/tests/utils/styleMock.js',
    '^.+\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/utils/fileMock.js',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
        plugins: [`${import.meta.dirname}/tests/utils/babelImportMeta.cjs`],
      },
    ],
  },
  transformIgnorePatterns: [`node_modules/(?!(${esmOnly.join('|')})/)`],
  setupFilesAfterEnv: ['<rootDir>/tests/utils/setup.tsx'],
  maxWorkers: 2,
  workerIdleMemoryLimit: '512MB',
};

export default baseConfig;
