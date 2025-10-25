import{Args,Directive,Field,Float,ID,InputType,Mutation,ObjectType,Parent,ResolveField,Resolver,ResolveReference}from'@nestjs/graphql';import{PlaidService}from'./plaid.service';import{Logger}from'@nestjs/common';import{Account as PlaidAccount,Transaction as PlaidTransaction}from'plaid';/**
 * @description Represents the response structure after successfully creating a Plaid Link token.
 */@ObjectType({description:'Response containing a Plaid Link token.'})class CreateLinkTokenResponse{@Field(()=>String,{description:'The token used to initialize Plaid Link on the client.'})link_token:string;@Field(()=>String,{description:'The expiration date of the link token in ISO 8601 format.'})expiration:string;}/**
 * @description Represents the balance details of a financial account.
 */@ObjectType({description:'Represents the balance of a financial account.'})class Balance{@Field(()=>Float,{nullable:true,description:'The amount of funds available for use.'})available:number|null;@Field(()=>Float,{description:'The total amount of funds in the account.'})current:number;@Field(()=>String,{nullable:true,description:'The ISO-4217 currency code of the balance.'})iso_currency_code:string|null;}/**
 * @description Represents a financial account linked by a user through Plaid.
 * This type is owned by the `plaid-integration-service` subgraph.
 */@ObjectType({description:'A financial account linked via Plaid.'})@Directive('@key(fields: "id")')export class Account{@Field(()=>ID,{description:'Plaid\'s unique ID for the account.'})id:string;@Field(()=>String,{description:'The official name of the account.'})name:string;@Field(()=>String,{nullable:true,description:'The last 2-4 alphanumeric characters of an account number.'})mask:string|null;@Field(()=>String,{description:'The high-level type of the account (e.g., "depository").'})type:string;@Field(()=>String,{nullable:true,description:'The specific subtype of the account (e.g., "checking").'})subtype:string|null;@Field(()=>Balance,{description:'The account\'s balance information.'})balance:Balance;}/**
 * @description Represents a financial transaction retrieved from a Plaid-linked account.
 * This type is owned by the `plaid-integration-service` subgraph.
 */@ObjectType({description:'A financial transaction associated with an account.'})@Directive('@key(fields: "id")')export class Transaction{@Field(()=>ID,{description:'Plaid\'s unique ID for the transaction.'})id:string;@Field(()=>String,{description:'The date the transaction posted, in ISO 8601 format (YYYY-MM-DD).'})date:string;@Field(()=>String,{description:'The merchant name or transaction description.'})name:string;@Field(()=>Float,{description:'The settled amount of the transaction. Positive for debits, negative for credits.'})amount:number;@Field(()=>String,{nullable:true,description:'The ISO-4217 currency code of the transaction.'})iso_currency_code:string|null;@Field(()=>[String],{description:'A hierarchical list of categories reflecting the transaction.'})category:string[];@Field({description:'Indicates if the transaction is still pending or has posted.'})pending:boolean;@Field(()=>ID,{description:'The ID of the account to which this transaction belongs.'})account_id:string;}/**
 * @description Input structure for fetching transactions within a specific date range.
 */@InputType({description:'Input for fetching transactions within a date range.'})class TransactionsByDateInput{@Field(()=>String,{description:'Start date in YYYY-MM-DD format.'})startDate:string;@Field(()=>String,{description:'End date in YYYY-MM-DD format.'})endDate:string;}/**
 * @description Represents the User entity, extending it to link Plaid-related data.
 * This type is owned by the `user-service` and is extended by this subgraph.
 */@ObjectType()@Directive('@extends')@Directive('@key(fields: "id")')export class User{@Field(()=>ID)@Directive('@external')id:string;@Field(()=>[Account],{nullable:true,description:'A list of Plaid-linked financial accounts for the user.'})accounts?:Account[];@Field(()=>[Transaction],{nullable:true,description:'A list of all transactions from Plaid-linked accounts for the user.'})transactions?:Transaction[];}/**
 * @description The main resolver for Plaid-related mutations. This resolver directly handles
 * GraphQL mutations for initiating the Plaid Link flow and exchanging public tokens.
 */@Resolver()export class PlaidMutationResolver{private readonly logger=new Logger(PlaidMutationResolver.name);constructor(private readonly plaidService:PlaidService){}/**
   * @description Creates a Plaid Link token for a user to initialize the frontend Link flow.
   * This token is short-lived and used by the client-side Plaid Link SDK.
   * @param {string} userId - The unique identifier of the user requesting the link token.
   * @returns {Promise<CreateLinkTokenResponse>} An object containing the link token and its expiration.
   */@Mutation(()=>CreateLinkTokenResponse,{description:'Creates a Plaid Link token for a user to initialize the frontend Link flow.'})async createLinkToken(@Args('userId',{type:()=>ID})userId:string,):Promise<CreateLinkTokenResponse>{this.logger.log(`Executing createLinkToken mutation for user: ${userId}`);const tokenData=await this.plaidService.createLinkToken(userId);return{link_token:tokenData.link_token,expiration:tokenData.expiration,};}/**
   * @description Exchanges a Plaid public token, obtained from the client-side Plaid Link SDK,
   * for a permanent access token. This access token is securely stored by this service
   * and enables ongoing data access to the linked financial institution.
   * @param {string} publicToken - The public token received from Plaid Link on the client-side.
   * @param {string} userId - The unique identifier of the user for whom the account is being linked.
   * @returns {Promise<boolean>} True if the public token exchange was successful, false otherwise.
   */@Mutation(()=>Boolean,{description:'Exchanges a Plaid public token for a permanent access token.'})async exchangePublicToken(@Args('publicToken',{type:()=>String})publicToken:string,@Args('userId',{type:()=>ID})userId:string,):Promise<boolean>{this.logger.log(`Executing exchangePublicToken mutation for user: ${userId}`);const{success}=await this.plaidService.exchangeAndStorePublicToken(publicToken,userId);return success;}}/**
 * @description Resolver responsible for extending the `User` entity with Plaid-related fields.
 * This resolver allows other subgraphs to query `accounts` and `transactions` directly on the `User` type.
 */@Resolver(()=>User)export class PlaidUserResolver{private readonly logger=new Logger(PlaidUserResolver.name);constructor(private readonly plaidService:PlaidService){}/**
   * @description Resolves the `accounts` field on the extended `User` entity.
   * Fetches all financial accounts linked via Plaid for the given user.
   * @param {User} user - The parent User object being resolved.
   * @returns {Promise<Account[]>} A list of Plaid-linked accounts.
   */@ResolveField('accounts',()=>[Account],{description:'Resolves a list of financial accounts linked via Plaid for the user.'})async getAccounts(@Parent()user:User,):Promise<any[]>{this.logger.log(`Resolving accounts for user: ${user.id}`);const plaidAccounts:PlaidAccount[]=await this.plaidService.getAccounts(user.id);return plaidAccounts.map(acc=>({id:acc.account_id,name:acc.name,mask:acc.mask,type:acc.type,subtype:acc.subtype,balance:acc.balances,}));}/**
   * @description Resolves the `transactions` field on the extended `User` entity.
   * Fetches financial transactions for the user within an optional date range.
   * @param {User} user - The parent User object being resolved.
   * @param {TransactionsByDateInput} input - Optional input for filtering transactions by date range.
   * @returns {Promise<Transaction[]>} A list of financial transactions.
   */@ResolveField('transactions',()=>[Transaction],{description:'Resolves a list of all transactions from Plaid-linked accounts for the user, with optional date filtering.'})async getTransactions(@Parent()user:User,@Args('input')input:TransactionsByDateInput,):Promise<any[]>{this.logger.log(`Resolving transactions for user: ${user.id} from ${input.startDate} to ${input.endDate}`);const plaidTransactions:PlaidTransaction[]=await this.plaidService.getTransactions(user.id,input.startDate,input.endDate);return plaidTransactions.map(tx=>({id:tx.transaction_id,date:tx.date,name:tx.name,amount:tx.amount,iso_currency_code:tx.iso_currency_code,category:tx.category,pending:tx.pending,account_id:tx.account_id,}));}/**
   * @description Resolves references to the `User` entity by its `id`.
   * This enables other subgraphs to extend the `User` entity.
   * @param {{__typename:string;id:string;}} reference - The incoming entity reference from the Apollo Gateway.
   * @returns {User} A partial User object (stub) containing only the `id`.
   */@ResolveReference()resolveReference(reference:{__typename:string;id:string;}):User{return{id:reference.id,};}}/**
 * @description Resolver responsible for resolving references to the `Account` entity.
 * This allows other subgraphs to reference an Account by its `id`.
 */@Resolver(()=>Account)export class PlaidAccountResolver{private readonly logger=new Logger(PlaidAccountResolver.name);constructor(private readonly plaidService:PlaidService){}/**
   * @description Resolves references to the `Account` entity by its `id`.
   * This is invoked by the Apollo Gateway when another subgraph requires details about an Account.
   * @param {{__typename:string;id:string;}} reference - The incoming entity reference from the Apollo Gateway.
   * @returns {Promise<Account>} The fully resolved Account object.
   * @throws {NotFoundException} If the account cannot be found.
   */@ResolveReference()async resolveReference(reference:{__typename:string;id:string;}):Promise<Account>{this.logger.log(`Resolving reference for Account with id: ${reference.id}`);const plaidAccount=await this.plaidService.getAccountById(reference.id);return{id:plaidAccount.account_id,name:plaidAccount.name,mask:plaidAccount.mask,type:plaidAccount.type,subtype:plaidAccount.subtype,balance:plaidAccount.balances,};}}/**
 * @description Resolver responsible for resolving references to the `Transaction` entity.
 * This allows other subgraphs to reference a Transaction by its `id`.
 */@Resolver(()=>Transaction)export class PlaidTransactionResolver{private readonly logger=new Logger(PlaidTransactionResolver.name);constructor(private readonly plaidService:PlaidService){}/**
   * @description Resolves references to the `Transaction` entity by its `id`.
   * This is invoked by the Apollo Gateway when another subgraph requires details about a Transaction.
   * @param {{__typename:string;id:string;}} reference - The incoming entity reference from the Apollo Gateway.
   * @returns {Promise<Transaction>} The fully resolved Transaction object.
   * @throws {NotFoundException} If the transaction cannot be found.
   */@ResolveReference()async resolveReference(reference:{__typename:string;id:string;}):Promise<Transaction>{this.logger.log(`Resolving reference for Transaction with id: ${reference.id}`);const plaidTransaction=await this.plaidService.getTransactionById(reference.id);return{id:plaidTransaction.transaction_id,date:plaidTransaction.date,name:plaidTransaction.name,amount:plaidTransaction.amount,iso_currency_code:plaidTransaction.iso_currency_code,category:plaidTransaction.category,pending:plaidTransaction.pending,account_id:plaidTransaction.account_id,};}}}```