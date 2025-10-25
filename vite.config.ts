import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

// Get environment variables for API Gateway URL and derive its origin
const GRAPHQL_GATEWAY_URL = process.env.VITE_GRAPHQL_GATEWAY_URL || 'http://localhost:8000/graphql';
const API_GATEWAY_ORIGIN = new URL(GRAPHQL_GATEWAY_URL).origin;

export default defineConfig({
  // Base path for deployment, e.g., for GitHub Pages.
  base: '/Demo-/',
  
  plugins: [
    react(),
    // Configure Module Federation for this host (shell) application.
    // This allows dynamically loading remote micro-frontends.
    federation({
      name: 'demobank_shell', // Unique name for this host application
      filename: 'remoteEntry.js', // Output file name for exposed modules (though typically hosts don't expose)
      remotes: {
        // Define the remote micro-frontends that this shell will consume.
        // These URLs should be configured via environment variables for flexibility
        // across development, staging, and production environments.
        dashboard_mfe: process.env.VITE_REMOTE_DASHBOARD_MFE_URL || 'http://localhost:5174/assets/remoteEntry.js',
        transactions_mfe: process.env.VITE_REMOTE_TRANSACTIONS_MFE_URL || 'http://localhost:5175/assets/remoteEntry.js',
        investments_mfe: process.env.VITE_REMOTE_INVESTMENTS_MFE_URL || 'http://localhost:5176/assets/remoteEntry.js',
        ai_advisor_mfe: process.env.VITE_REMOTE_AI_ADVISOR_MFE_URL || 'http://localhost:5177/assets/remoteEntry.js',
        settings_mfe: process.env.VITE_REMOTE_SETTINGS_MFE_URL || 'http://localhost:5178/assets/remoteEntry.js',
        // Add other micro-frontends as they are factored out from the monolithic frontend.
        // Each remote would typically correspond to a primary view.
      },
      shared: {
        // Define shared dependencies to minimize bundle size and prevent conflicts.
        // It's crucial that all micro-frontends consume these shared dependencies
        // from the host for consistency and performance.
        react: {
          singleton: true, // Ensure only a single instance of React is loaded.
          requiredVersion: '^19.1.1', // Match the version in this project's package.json.
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
          requiredVersion: '^2.2.5',
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
        // Add other critical shared libraries here (e.g., UI libraries, utility-belt libraries).
      },
    }),
  ],
  
  server: {
    // Development server port, matching the `frontend` service in `docker-compose.yml`.
    port: 5173,
    host: '0.0.0.0', // Allow access from network.
    proxy: {
      // Proxy all /graphql requests to the main API Gateway (Kong).
      // This ensures that the frontend consistently communicates with the backend
      // through the designated gateway, adhering to the service mesh directive.
      '/graphql': {
        target: API_GATEWAY_ORIGIN,
        changeOrigin: true, // Necessary for virtual hosted sites.
        secure: false, // Set to `true` in production with HTTPS.
      },
      // Proxy any remaining /api REST endpoints to the main API Gateway.
      '/api': {
        target: API_GATEWAY_ORIGIN,
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Resolve aliases for cleaner imports (e.g., `@/components/Button`).
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },

  build: {
    // Essential for Module Federation to prevent eager loading of remote chunks.
    modulePreload: false,
    // Target modern JavaScript for better performance.
    target: 'esnext',
    // Disable minification in development builds for easier debugging of MFE.
    minify: false, 
    // Disable CSS code splitting for simpler CSS management across MFEs.
    cssCodeSplit: false,
  },
});