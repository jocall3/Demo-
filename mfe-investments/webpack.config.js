const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].[contenthash].js',
      clean: true,
      // The publicPath is crucial for Module Federation to correctly load remote modules.
      // It should be dynamic based on the deployment environment or explicit env var.
      publicPath: isProduction 
        ? 'https://your-production-cdn.com/mfe-investments/' 
        : 'http://localhost:3002/',
    },
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-react', '@babel/preset-typescript'],
              plugins: [
                // Add any necessary Babel plugins, e.g., for decorators if using NestJS in frontend
                // ['@babel/plugin-proposal-decorators', { 'legacy': true }],
                // ['@babel/plugin-proposal-class-properties', { 'loose': true }],
              ],
            },
          },
        },
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-react'],
            },
          },
        },
        {
          test: /\.(css|sass|scss)$/,
          use: ['style-loader', 'css-loader', 'sass-loader'],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        filename: 'index.html',
      }),
      new ModuleFederationPlugin({
        name: 'investments',
        filename: 'remoteEntry.js',
        exposes: {
          // Expose the main component of this micro-frontend
          './InvestmentsView': './src/InvestmentsApp.tsx',
        },
        shared: {
          // Share common dependencies to avoid duplication and ensure singletons
          react: {
            singleton: true, 
            requiredVersion: '^18.2.0', // Ensure compatibility with host app
            eager: true, // Eagerly load for immediate use
          },
          'react-dom': {
            singleton: true, 
            requiredVersion: '^18.2.0',
            eager: true,
          },
          '@apollo/client': {
            singleton: true,
            requiredVersion: '^3.7.1',
            eager: true,
          },
          // Add other shared libraries as needed by the overall micro-frontend architecture
          // For example, if using Redux globally:
          // '@reduxjs/toolkit': { singleton: true, requiredVersion: '^1.9.0', eager: true },
          // 'react-redux': { singleton: true, requiredVersion: '^8.0.5', eager: true },
        },
      }),
      // Define environment variables to be available in the client-side code
      new (require('webpack').DefinePlugin)({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        // Add other environment variables here, e.g., for API endpoints
        // 'process.env.VITE_GRAPHQL_GATEWAY_URL': JSON.stringify(process.env.VITE_GRAPHQL_GATEWAY_URL),
      }),
    ],
    devServer: {
      port: 3002, // This MFE will run on port 3002 during local development
      historyApiFallback: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
    },
  };
};