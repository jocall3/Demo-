const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
const path = require('path');

/**
 * Webpack configuration for the shared UI component library.
 * This configuration sets up the library as a Webpack Module Federation remote,
 * allowing other micro-frontends (like the shell, dashboard, transactions) to
 * consume its components dynamically at runtime.
 *
 * Key Responsibilities:
 * 1.  Exposes shared React components (e.g., Card, PlaidLinkButton) and types.
 * 2.  Defines shared singleton dependencies (React, ReactDOM) to be provided by the host.
 * 3.  Configures a development server for testing and developing components in isolation.
 * 4.  Includes loaders for TypeScript, JSX, and CSS (including PostCSS for Tailwind).
 */
module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index.ts', // Main entry point of the library
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      // The publicPath must be an absolute URL pointing to where this MFE is deployed.
      // For local development, this is its own dev server.
      // For production, this would be its location on a CDN or static file server.
      publicPath: 'http://localhost:3001/',
      clean: true,
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    },

    module: {
      rules: [
        {
          test: /\.m?js$/,
          resolve: {
            fullySpecified: false,
          },
        },
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-react', '@babel/preset-typescript'],
            },
          },
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
          type: 'asset/resource',
        },
      ],
    },

    plugins: [
      new ModuleFederationPlugin({
        name: 'ui_library',
        filename: 'remoteEntry.js',
        exposes: {
          // Expose all shared components that other MFEs will consume.
          './Card': './src/components/Card.tsx',
          './PlaidLinkButton': './src/components/PlaidLinkButton.tsx',
          './types': './src/types.ts',
          // Exposing more common components as per architectural directives.
          './BalanceSummary': './src/components/BalanceSummary.tsx',
          './RecentTransactions': './src/components/RecentTransactions.tsx',
          './InvestmentPortfolio': './src/components/InvestmentPortfolio.tsx',
          './AIInsights': './src/components/AIInsights.tsx',
          './ImpactTracker': './src/components/ImpactTracker.tsx',
        },
        shared: {
          // Define shared dependencies to ensure they are singletons across the application.
          // Versions should be compatible across all MFEs and the shell.
          react: {
            singleton: true,
            requiredVersion: '^19.1.1',
          },
          'react-dom': {
            singleton: true,
            requiredVersion: '^19.1.1',
          },
          recharts: {
            singleton: true,
            requiredVersion: '^3.3.0',
          },
          '@tanstack/react-query': {
            singleton: true,
            requiredVersion: '^5.51.1',
          },
          '@apollo/client': {
            singleton: true,
            requiredVersion: '^3.10.8',
          },
        },
      }),
      // HtmlWebpackPlugin is used to generate an HTML file for standalone development/testing.
      new HtmlWebpackPlugin({
        template: './public/index.html',
      }),
    ],

    devServer: {
      port: 3001, // Unique port for the UI library dev server
      historyApiFallback: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
    },
  };
};
