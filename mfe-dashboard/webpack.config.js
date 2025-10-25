const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
const path = require('path');
const deps = require('./package.json').dependencies;

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const port = 8081; // Port for this MFE in standalone mode

  return {
    entry: './src/index', // Entry point for standalone development
    mode: isProduction ? 'production' : 'development',

    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      port: port,
      historyApiFallback: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
    },

    output: {
      // 'auto' is the recommended public path for Module Federation to allow dynamic path resolution.
      publicPath: 'auto',
      // Clean the output directory before each build.
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
              presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
            },
          },
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader', 'postcss-loader'], // Assumes TailwindCSS is in use
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
          type: 'asset/resource',
        },
      ],
    },

    plugins: [
      new ModuleFederationPlugin({
        // The name of the remote application. This must be unique.
        name: 'dashboard',
        // The name of the remote entry file that the host application will load.
        filename: 'remoteEntry.js',
        // Modules that this remote application exposes to the host.
        exposes: {
          // Exposes the main application bootstrap logic. The shell will import this as 'dashboard/DashboardApp'.
          './DashboardApp': './src/bootstrap.tsx',
        },
        // Defines shared dependencies to avoid duplication across the federated application.
        shared: {
          ...deps,
          // Enforce single instances of critical libraries to prevent version conflicts and state issues.
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
          '@apollo/client': {
            singleton: true,
            requiredVersion: deps['@apollo/client'],
          },
          '@tanstack/react-query': {
            singleton: true,
            requiredVersion: deps['@tanstack/react-query'],
          },
          // As per the architectural directive, a shared UI library would also be shared here
          // if it were a dependency in package.json. e.g.:
          // '@demobank/ui-lib': {
          //   singleton: true,
          //   requiredVersion: deps['@demobank/ui-lib'],
          // },
        },
      }),
      // This plugin generates an HTML file to serve the MFE in standalone mode for development and testing.
      new HtmlWebpackPlugin({
        template: './public/index.html',
      }),
    ],

    devtool: isProduction ? 'source-map' : 'cheap-module-source-map',
  };
};
