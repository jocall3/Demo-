import { Args, Field, Float, ID, InputType, Mutation, ObjectType, Resolver } from '@nestjs/graphql';
import { BankingService } from './banking.service';

// NOTE: As part of the refactoring to a domain-oriented structure,
// the User entity extension and its related object types (Account, Transaction)
// have been moved to their respective domain modules (e.g., UsersModule, AccountsModule, TransactionsModule).
// This resolver now focuses on top-level mutations for banking integrations.

// --- GraphQL Object Types ---

@ObjectType({ description: 'Response containing a Plaid Link token.' })
class CreateLinkTokenResponse {
  @Field(() => String, { description: 'The token to initialize Plaid Link on the frontend.' })
  link_token: string;

  @Field(() => String, { description: 'The expiration date of the link token in ISO 8601 format.' })
  expiration: string;
}

@ObjectType({ description: 'Confirms the status of a money transfer.' })
class SendMoneyResponse {
  @Field(() => ID, { description: 'A unique identifier for the initiated transaction.' })
  transactionId: string;

  @Field(() => String, { description: 'The current status of the payment (e.g., SUBMITTED, PROCESSING, COMPLETED).' })
  status: string;
}

// --- GraphQL Input Types ---

@InputType({ description: 'Input for the sendMoney mutation.' })
class SendMoneyInput {
  @Field(() => ID, { description: 'The ID of the user initiating the payment.' })
  userId: string; // In a production app, this would be derived from the auth context.

  @Field({ description: 'An identifier for the recipient (e.g., account number, email, or username).' })
  recipient: string;

  @Field(() => Float, { description: 'The amount of money to send.' })
  amount: number;

  @Field({ nullable: true, defaultValue: 'USD', description: 'The ISO currency code.' })
  currency?: string;
}

// --- Main Resolver for Banking Mutations ---

/**
 * Handles top-level mutations related to banking integrations like Plaid and Stripe.
 * This resolver is part of the refactoring to separate concerns. Entity-specific
 * fields (like a user's accounts) are resolved in their own domain-specific resolvers.
 */
@Resolver()
export class BankingResolver {
  constructor(private readonly bankingService: BankingService) {}

  // --- Mutations ---

  @Mutation(() => CreateLinkTokenResponse, {
    description: 'Creates a Plaid Link token to initialize the Plaid Link flow on the client.',
  })
  async createLinkToken(
    @Args('userId', { type: () => ID })
    userId: string,
  ): Promise<CreateLinkTokenResponse> {
    // The service returns a bit more data than we need to expose, so we select what's needed.
    const { request_id, ...tokenData } = await this.bankingService.createLinkToken(userId);
    return tokenData;
  }

  @Mutation(() => Boolean, {
    description: 'Exchanges a Plaid public token for an access token and links the account.',
  })
  async exchangePublicToken(
    @Args('publicToken', { type: () => String })
    publicToken: string,
    @Args('userId', { type: () => ID })
    userId: string,
  ): Promise<boolean> {
    const { success } = await this.bankingService.exchangeAndStorePublicToken(publicToken, userId);
    return success;
  }

  @Mutation(() => SendMoneyResponse, {
    description: 'Initiates a payment to a recipient, potentially via an external service like Stripe.',
  })
  async sendMoney(
    @Args('input') input: SendMoneyInput,
  ): Promise<SendMoneyResponse> {
    // The BankingService would orchestrate this call, possibly involving a StripeService.
    const transactionId = await this.bankingService.sendMoney(input);
    return { transactionId, status: 'SUBMITTED' };
  }
}
