/* eslint-env node */
const { VanillaExtractPlugin } = require('@vanilla-extract/webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const EsLintWebpackPlugin = require('eslint-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const { DefinePlugin } = require('webpack')

const isProduction = process.env.NODE_ENV === 'production'
const commitHash = require('child_process').execSync('git rev-parse HEAD').toString().trim()

module.exports = {
  babel: {
    plugins: ['@vanilla-extract/babel-plugin'],
    env: {
      test: {
        plugins: ['istanbul'],
      },
      development: {
        plugins: ['istanbul'],
      },
    },
  },
  jest: {
    configure(jestConfig) {
      return Object.assign({}, jestConfig, {
        transformIgnorePatterns: ['@uniswap/conedison/format', '@uniswap/conedison/provider'],
        moduleNameMapper: {
          '@uniswap/conedison/format': '@uniswap/conedison/dist/format',
          '@uniswap/conedison/provider': '@uniswap/conedison/dist/provider',
        },
      })
    },
  },
  webpack: {
    plugins: [new VanillaExtractPlugin({ identifiers: 'short' })],
    configure: (webpackConfig) => {
      // Extend process.env with dynamic values (eg commit hash).
      Object.assign(webpackConfig.plugins.find((plugin) => plugin instanceof DefinePlugin).definitions['process.env'], {
        REACT_APP_GIT_COMMIT_HASH: JSON.stringify(commitHash),
      })

      if (isProduction) {
        // Type checking and linting are only necessary as part of development and testing.
        // Omit them from production builds, as they slow down the feedback loop.
        webpackConfig.plugins = webpackConfig.plugins.filter((plugin) => {
          if (plugin instanceof ForkTsCheckerWebpackPlugin) return false
          if (plugin instanceof EsLintWebpackPlugin) return false
          return true
        })

        // CSS ordering is mitigated through scoping / naming conventions, so we can ignore order warnings.
        // See https://webpack.js.org/plugins/mini-css-extract-plugin/#remove-order-warnings.
        webpackConfig.plugins.find((plugin) => plugin instanceof MiniCssExtractPlugin).options.ignoreOrder = true
      }

      // We're currently on Webpack 4.x which doesn't support the `exports` field in package.json.
      // Instead, we need to manually map the import path to the correct exports path (eg dist or build folder).
      // See https://github.com/webpack/webpack/issues/9509.
      webpackConfig.resolve.alias['@uniswap/conedison'] = '@uniswap/conedison/dist'

      return webpackConfig
    },
  },
}
