const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
const Dotenv = require('dotenv-webpack');
const path = require('path');
const deps = require('./package.json').dependencies;

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index.ts', // Entry point for standalone development
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].[contenthash].js',
      publicPath: 'auto', // Use 'auto' for flexible deployments
      clean: true,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    },
    module: {
      rules: [
        {
          test: /\.m?js/,
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
          use: ['style-loader', 'css-loader', 'postcss-loader'], // For Tailwind CSS
        },
        {
          test: /\.(png|jpe?g|gif|webp|svg)$/i,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      new Dotenv(),
      new ModuleFederationPlugin({
        name: 'investments', // Unique name for this MFE
        filename: 'remoteEntry.js', // Standard filename for the remote entry
        exposes: {
          // Expose the main component for the Shell to consume
          './InvestmentsView': './src/InvestmentsView.tsx',
        },
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
          // Even if not a direct dependency, share core libraries provided by the shell
          'react-router-dom': {
            singleton: true,
            requiredVersion: deps['react-router-dom'],
          },
          '@apollo/client': {
            singleton: true,
            requiredVersion: deps['@apollo/client'],
          },
          '@tanstack/react-query': {
            singleton: true,
            requiredVersion: deps['@tanstack/react-query'],
          },
          'recharts': {
            singleton: true,
            requiredVersion: deps.recharts,
          },
        },
      }),
      new HtmlWebpackPlugin({
        template: './public/index.html', // Template for standalone development
      }),
    ],
    devServer: {
      port: 8083, // Unique port for this MFE, as defined in shell's webpack config
      historyApiFallback: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
    },
  };
};
