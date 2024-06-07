/** @format */

module.exports = {
  extends: ['airbnb', 'prettier'],
  parser: '@typescript-eslint/parser',
  env: {
    jest: true,
    browser: true,
    es6: true,
    mocha: true,
    node: true,
  },
  plugins: ['@typescript-eslint'],
  rules: {},
  overrides: [],
};