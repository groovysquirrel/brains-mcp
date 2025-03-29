/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.content\\.md$': '<rootDir>/test/fileTransformer.js',
    '^.+\\.diagram\\.md$': '<rootDir>/test/fileTransformer.js'
  },
};