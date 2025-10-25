const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
const path = require('path');
const Dotenv = require('dotenv-webpack');

// Get dependencies from package.json to manage shared modules
const deps = require('./package.json').dependencies;

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index',
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',

    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      port: 8082, // Unique port for the transactions MFE
      historyApiFallback: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
    },

    output: {
      // Use 'auto' publicPath for flexibility in deployment environments.
      // It allows Webpack to automatically determine the path from which to load federated modules.
      publicPath: 'auto',
      clean: true,
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    },

    module: {
      rules: [
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
          use: ['style-loader', 'css-loader', 'postcss-loader'], // Assumes TailwindCSS is used
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
          type: 'asset/resource',
        },
      ],
    },

    plugins: [
      new ModuleFederationPlugin({
        name: 'transactions',
        filename: 'remoteEntry.js',
        exposes: {
          // Exposes the main application bootstrap logic for the shell to consume.
          './TransactionsApp': './src/bootstrap',
        },
        shared: {
          // Explicitly define shared dependencies as singletons to ensure a single version is used
          // across the entire application, as managed by the shell.
          react: {
            singleton: true,
            requiredVersion: deps.react,
          },
          'react-dom': {
            singleton: true,
            requiredVersion: deps['react-dom'],
          },
          '@apollo/client': {
            singleton: true,
            requiredVersion: deps['@apollo/client'],
          },
          '@tanstack/react-query': {
            singleton: true,
            requiredVersion: deps['@tanstack/react-query'],
          },
          'react-redux': {
            singleton: true,
            requiredVersion: deps['react-redux'],
          },
          '@reduxjs/toolkit': {
            singleton: true,
            requiredVersion: deps['@reduxjs/toolkit'],
          },
          'recharts': {
            singleton: true,
            requiredVersion: deps.recharts,
          },
          // The shared UI component library, as per architectural directive.
          // This assumes '@demobank/ui-lib' is a dependency in package.json.
          '@demobank/ui-lib': {
            singleton: true,
            requiredVersion: deps['@demobank/ui-lib'],
          },
        },
      }),
      new HtmlWebpackPlugin({
        template: './public/index.html', // For standalone development
      }),
      new Dotenv(), // For handling .env files
    ],
  };
};
