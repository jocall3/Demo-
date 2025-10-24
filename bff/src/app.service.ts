import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// NOTE: In a full NestJS application, the logic for interacting with downstream
// services like Plaid, Stripe, and Google GenAI would be encapsulated in their
// own dedicated, injectable services (e.g., PlaidService, GenaiService).
// For this single-file generation, we are simplifying that pattern by including
// simulation logic directly within the AppService.

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly genAiApiKey: string;

  constructor(private configService: ConfigService) {
    // Securely retrieve API keys from the configuration managed by NestJS.
    // The frontend client will never have access to these keys.
    this.genAiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!this.genAiApiKey) {
      this.logger.warn('GEMINI_API_KEY is not configured. AI features will fail.');
    }
  }

  /**
   * Provides a simple health check endpoint for the BFF service.
   */
  getHealth(): { status: string; timestamp: string } {
    this.logger.log('Health check endpoint was hit');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Acts as a secure proxy to the Google GenAI API.
   * The BFF is responsible for attaching the secret API key to the downstream request.
   * @param prompt - The user's prompt received from the frontend.
   * @returns A promise that resolves to an object containing the AI-generated text.
   */
  async getAiInsight(prompt: string): Promise<{ text: string }> {
    this.logger.log(`Proxying request to GenAI service for prompt: "${prompt.substring(0, 40)}..."`);
    if (!this.genAiApiKey) {
      this.logger.error('Cannot get AI insight because GEMINI_API_KEY is missing.');
      // Provide a user-friendly error message back to the client.
      return { text: 'The AI service is not configured correctly on the server.' };
    }

    // In a real application, you would use the @google/genai SDK here.
    // Example:
    // const genAI = new GoogleGenerativeAI(this.genAiApiKey);
    // const model = genAI.getGenerativeModel({ model: "gemini-pro"});
    // const result = await model.generateContent(prompt);
    // return { text: result.response.text() };

    // Simulating the async API call for this exercise.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ text: `This is a simulated AI response to your prompt: "${prompt}". The BFF has successfully and securely proxied this request.` });
      }, 500);
    });
  }

  /**
   * Simulates fetching and aggregating dashboard data for a user.
   * This demonstrates the BFF's core role as an aggregator, combining data from
   * multiple (simulated) downstream services into a single, tailored payload for the UI.
   * @param userId - The ID of the user.
   */
  async getDashboardData(userId: string): Promise<any> {
    this.logger.log(`Aggregating dashboard data for user ${userId}`);

    // Simulate calling a banking core service for account data.
    const accountData = {
      totalBalance: 125389.54,
      accounts: [
        { id: 'acc_1', name: 'Primary Checking', balance: 15432.88 },
        { id: 'acc_2', name: 'High-Yield Savings', balance: 89102.15 },
        { id: 'acc_3', name: 'Investment Portfolio', balance: 20854.51 },
      ],
    };

    // Simulate calling a separate transaction service.
    const transactionData = {
      recentTransactions: [
        { id: 'txn_1', description: 'QuantumFlix Subscription', amount: -15.99 },
        { id: 'txn_2', description: 'Paycheck Deposit', amount: 2500.00 },
        { id: 'txn_3', description: 'Online Store', amount: -174.99 },
      ],
    };

    // The BFF combines these disparate data sources into one cohesive response for the client.
    return {
      ...accountData,
      ...transactionData,
      lastRefreshed: new Date().toISOString(),
    };
  }

  /**
   * Simulates the creation of a Plaid Link Token.
   * This is a critical BFF function, as it securely handles the Plaid client_id and secret,
   * abstracting the complexity away from the frontend.
   * @param userId - The user ID for whom the token is being created.
   */
  async getPlaidLinkToken(userId: string): Promise<{ link_token: string }> {
    this.logger.log(`Generating Plaid Link token for user ${userId}`);

    // In a real implementation, you would use the Plaid client library:
    // const plaidClient = new PlaidApi({ client_id, secret, ... });
    // const request = { user: { client_user_id: userId }, ... };
    // const response = await plaidClient.linkTokenCreate(request);
    // return { link_token: response.data.link_token };

    // Simulating the async API call and response.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ link_token: `link-sandbox-mock-${Date.now()}` });
      }, 300);
    });
  }
}
