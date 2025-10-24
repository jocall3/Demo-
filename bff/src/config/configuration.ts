import { registerAs } from '@nestjs/config';

/**
 * Defines and loads application configuration from environment variables.
 * This function is registered with NestJS's ConfigModule to provide
 * a structured, typed configuration object throughout the application.
 */
export default registerAs('config', () => {
  return {
    // Application environment ('development', 'production', 'test', etc.)
    env: process.env.NODE_ENV || 'development',
    isProd: process.env.NODE_ENV === 'production',

    // Port the application will listen on
    port: parseInt(process.env.PORT, 10) || 3001,

    // CORS configuration for the frontend application
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
    },

    // Configuration for Google Generative AI services (e.g., Gemini)
    google: {
      geminiApiKey: process.env.GOOGLE_GEMINI_API_KEY,
    },

    // Configuration for Plaid API (simulated banking core)
    // In a real application, PLAID_ENV would be 'sandbox', 'development', or 'production'.
    plaid: {
      clientId: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      env: process.env.PLAID_ENV || 'sandbox',
    },

    // Configuration for Stripe API (simulated banking core)
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publicKey: process.env.STRIPE_PUBLIC_KEY,
    },

    // API Gateway secrets if needed for service-to-service authentication
    // For example, a shared secret to verify requests are coming from the gateway.
    apiGateway: {
      apiKey: process.env.API_GATEWAY_API_KEY,
    },
  };
});
