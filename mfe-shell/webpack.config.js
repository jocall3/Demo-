const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
const Dotenv = require('dotenv-webpack');
const path = require('path');
const deps = require('./package.json').dependencies;

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/bootstrap.tsx',
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].[contenthash].js',
      publicPath: 'auto',
      clean: true,
    },

    devServer: {
      port: 8080, // Host application runs on port 8080
      historyApiFallback: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
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
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader'], // Added postcss-loader for TailwindCSS
        },
        {
          test: /\.(png|jpe?g|gif|svg|webp)$/i,
          type: 'asset/resource',
        },
      ],
    },

    plugins: [
      // Injects environment variables from a .env file into the build process.
      new Dotenv(),

      new ModuleFederationPlugin({
        name: 'shell', // The name of the host application
        // Remotes are the micro-frontends that this shell will consume.
        // URLs are sourced from environment variables for flexibility between dev/prod.
        remotes: {
          dashboard: `dashboard@${process.env.MFE_DASHBOARD_URL || 'http://localhost:8081'}/remoteEntry.js`,
          transactions: `transactions@${process.env.MFE_TRANSACTIONS_URL || 'http://localhost:8082'}/remoteEntry.js`,
          investments: `investments@${process.env.MFE_INVESTMENTS_URL || 'http://localhost:8083'}/remoteEntry.js`,
        },
        // Defines shared libraries. These will be loaded only once by the shell,
        // and all remotes will use these instances.
        shared: {
          ...deps,
          react: {
            singleton: true,
            requiredVersion: deps.react,
          },
          'react-dom': {
            singleton: true,
            requiredVersion: deps['react-dom'],
          },
          'react-router-dom': {
            singleton: true,
            requiredVersion: deps['react-router-dom'],
          },
          '@reduxjs/toolkit': {
            singleton: true,
            requiredVersion: deps['@reduxjs/toolkit'],
          },
          'react-redux': {
            singleton: true,
            requiredVersion: deps['react-redux'],
          },
          '@apollo/client': {
            singleton: true,
            requiredVersion: deps['@apollo/client'],
          },
          '@tanstack/react-query': {
            singleton: true,
            requiredVersion: deps['@tanstack/react-query'],
          },
          recharts: {
            singleton: true,
            requiredVersion: deps.recharts,
          },
          // Placeholder for the shared UI component library as per architecture directives
          '@demobank/ui-lib': {
            singleton: true,
            // requiredVersion: deps['@demobank/ui-lib']
          },
        },
      }),

      new HtmlWebpackPlugin({
        template: './public/index.html',
      }),
    ],

    optimization: {
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
      },
    },
  };
};
