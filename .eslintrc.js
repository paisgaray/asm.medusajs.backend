module.exports = {
  root: true,
  env: { es2021: true, node: true },
  extends: [ 'standard', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended' ],
  plugins: [ '@typescript-eslint/eslint-plugin', 'eslint-plugin-import-helpers' ],
  parser: '@typescript-eslint/parser',
  parserOptions: { project: "tsconfig.json", sourceType: "module" },
  overrides: [
    {
      files: ["src/admin/**/*"],
      parserOptions: {
        project: "./src/admin/tsconfig.json",
        sourceType: "module"
      }
    },
    {
      files: ["src/scripts/product-import/**/*"],
      parserOptions: {
        project: null,
        sourceType: "module"
      }
    }
  ],
  rules: {
    "camelcase": "off",
    "dot-notation": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-require-imports": "off",
    "@typescript-eslint/no-var-requires": "off",
    "prettier/prettier": [
      "error",
      {
        "printWidth": 120,
        "tabWidth": 2,
        "singleQuote": true,
        "trailingComma": "all",
        "arrowParens": "always",
        "endOfLine": "lf"
      }
    ],
    "@typescript-eslint/no-unused-vars": [
			"warn", { "argsIgnorePattern": "_" }
		],
    "import-helpers/order-imports": [
      "warn",
      {
        "newlinesBetween": "always",
        "groups": [ "module", "/^@//" ],
        "alphabetize": { "order": "asc", "ignoreCase": true }
      }
    ]
  },
  settings: {
    'import/parsers': { [require.resolve('@typescript-eslint/parser')]: ['.ts', '.d.ts'] },
  }
}
