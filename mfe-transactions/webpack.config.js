const HtmlWebPackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const path = require("path");
const Dotenv = require('dotenv-webpack');

module.exports = (_, argv) => ({
  entry: "./src/index",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    // Public path needs to be absolute for Module Federation to correctly load remoteEntry.js
    publicPath: argv.mode === "development" ? "http://localhost:8081/" : "/mfe-transactions/", // Adjust for production deployment base path
  },
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
  },
  devServer: {
    port: 8081, // Unique development port for this micro-frontend
    historyApiFallback: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-react", "@babel/preset-typescript"],
            // Add any necessary Babel plugins for React 19 / JSX transform
            // plugins: ["@babel/plugin-transform-runtime"]
          },
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader", "postcss-loader"], // postcss-loader for Tailwind CSS
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "transactions", // Unique name for this remote Micro-Frontend
      filename: "remoteEntry.js",
      remotes: {},
      exposes: {
        "./TransactionsView": "./src/TransactionsView", // Expose the main TransactionsView component
        "./Routes": "./src/Routes", // Optionally expose routes if needed by the shell application
      },
      shared: {
        // Share common dependencies to avoid multiple instances and reduce bundle size
        ...require("./package.json").dependencies,
        react: {
          singleton: true, // Only one instance of React should be loaded
          requiredVersion: require("./package.json").dependencies.react,
          eager: true, // Eagerly load for immediate availability
        },
        "react-dom": {
          singleton: true,
          requiredVersion: require("./package.json").dependencies["react-dom"],
          eager: true,
        },
        "react-redux": {
          singleton: true,
          requiredVersion: require("./package.json").dependencies["react-redux"],
          eager: true,
        },
        "@reduxjs/toolkit": {
          singleton: true,
          requiredVersion: require("./package.json").dependencies["@reduxjs/toolkit"],
          eager: true,
        },
        "@apollo/client": {
          singleton: true,
          requiredVersion: require("./package.json").dependencies["@apollo/client"],
          eager: true,
        },
        "graphql": {
          singleton: true,
          requiredVersion: require("./package.json").dependencies["graphql"],
          eager: true,
        },
        // Add other core libraries that should be shared across micro-frontends
      },
    }),
    new HtmlWebPackPlugin({
      template: "./public/index.html", // Path to the HTML template for standalone development
    }),
    new Dotenv(), // Enables loading environment variables from .env files
  ],
});