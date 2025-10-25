import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

// The API Gateway is the single point of entry for all backend requests.
const API_GATEWAY_URL = process.env.VITE_GRAPHQL_GATEWAY_URL || 'http://localhost:8000';

// https://vitejs.dev/config/
export default defineConfig({
  // The base path for deployment. This is important for routing and asset loading.
  base: '/Demo-/',

  plugins: [
    react(),
    // Configure Module Federation for this host (shell) application.
    // This allows dynamically loading remote micro-frontends (MFEs).
    federation({
      name: 'demobank_shell', // Unique name for this host application.
      filename: 'remoteEntry.js', // Standard filename for the federation manifest.
      remotes: {
        // Define the remote MFEs that this shell will consume.
        // URLs should be configured via environment variables for deployment flexibility.
        dashboard: process.env.VITE_DASHBOARD_MFE_URL || 'http://localhost:3001/assets/remoteEntry.js',
        transactions: process.env.VITE_TRANSACTIONS_MFE_URL || 'http://localhost:3002/assets/remoteEntry.js',
        investments: process.env.VITE_INVESTMENTS_MFE_URL || 'http://localhost:3003/assets/remoteEntry.js',
        // Add other MFEs as they are decomposed from the monolith.
      },
      shared: {
        // Define shared dependencies to prevent version conflicts and reduce bundle sizes.
        // All MFEs will use these instances provided by the shell.
        react: {
          singleton: true,
          requiredVersion: '^19.1.1',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^19.1.1',
        },
        '@apollo/client': {
          singleton: true,
          requiredVersion: '^3.10.8',
        },
        '@auth0/auth0-react': {
          singleton: true,
          requiredVersion: '^2.2.1',
        },
        'react-redux': {
          singleton: true,
          requiredVersion: '^9.1.2',
        },
        '@reduxjs/toolkit': {
          singleton: true,
          requiredVersion: '^2.2.6',
        },
        '@tanstack/react-query': {
          singleton: true,
          requiredVersion: '^5.51.1',
        },
        'recharts': {
          singleton: true,
          requiredVersion: '^3.3.0',
        },
        'graphql': {
          singleton: true,
          requiredVersion: '^16.9.0',
        },
      },
    }),
  ],

  // Configuration for the Vite development server.
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow access from the network (e.g., within Docker).
    proxy: {
      // Proxy all API requests starting with /graphql to the main API Gateway.
      // This centralizes backend communication and avoids CORS issues in development.
      '/graphql': {
        target: API_GATEWAY_URL,
        changeOrigin: true, // Recommended for virtual hosted sites.
        secure: false, // Set to `true` in production if the gateway uses HTTPS.
      },
    },
  },

  // Resolve aliases for cleaner imports (e.g., `@/components/Button`).
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },

  // Build-specific configuration for Module Federation.
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false, // Minification can sometimes interfere with federation; disable if issues arise.
    cssCodeSplit: false, // Keep CSS bundled for simplicity across MFEs.
  },
});
  // Preview server configuration (for `vite preview`).
  preview: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    proxy: {
      '/graphql': {
        target: API_GATEWAY_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
