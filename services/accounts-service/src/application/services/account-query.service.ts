/**
 * @file services/accounts-service/src/application/services/account-query.service.ts
 * @description This file contains the AccountQueryService, which is responsible for handling all read-only
 * operations related to the Account domain. It represents the "Query" side of the CQRS pattern.
 *
 * @architectural-note This service is part of the application layer in a Hexagonal Architecture.
 * It orchestrates read operations by depending on an abstract port (`IAccountQueryRepository`),
 * completely decoupling it from the specific data storage technology (e.g., TypeORM, Mongoose).
 * The service itself contains no business logic; it simply delegates calls to the repository port.
 *
 * @see IAccountQueryRepository - The port this service depends on for data retrieval.
 * @see AccountReadModel - The data transfer object representing the denormalized account projection.
 */

import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { IAccountQueryRepository } from '../ports/account-query.repository.port';
import { AccountReadModel } from '../../domain/models/account.read-model';

/**
 * @class AccountQueryService
 * @description Application service for handling read-only queries for accounts.
 * Implements the query-side of the CQRS pattern for the Account bounded context.
 */
@Injectable()
export class AccountQueryService {
  private readonly logger = new Logger(AccountQueryService.name);

  /**
   * @constructor
   * @description Injects the repository port, decoupling the application service from the
   * specific persistence implementation.
   * @param {IAccountQueryRepository} accountQueryRepository - The repository adapter for the account read model.
   */
  constructor(
    @Inject('IAccountQueryRepository')
    private readonly accountQueryRepository: IAccountQueryRepository,
  ) {}

  /**
   * @method findById
   * @description Finds a single account by its unique identifier from the read model.
   * @param {string} id - The unique identifier of the account.
   * @returns {Promise<AccountReadModel>} A promise that resolves to the account read model.
   * @throws {NotFoundException} If no account is found with the given ID.
   */
  async findById(id: string): Promise<AccountReadModel> {
    this.logger.debug(`Executing findById query for account ID: ${id}`);
    const account = await this.accountQueryRepository.findById(id);
    if (!account) {
      this.logger.warn(`Account with ID "${id}" not found in the read model.`);
      throw new NotFoundException(`Account with ID "${id}" not found.`);
    }
    return account;
  }

  /**
   * @method findAllByUserId
   * @description Finds all accounts associated with a specific user ID from the read model.
   * @param {string} userId - The unique identifier of the user.
   * @returns {Promise<AccountReadModel[]>} A promise that resolves to an array of account read models.
   */
  async findAllByUserId(userId: string): Promise<AccountReadModel[]> {
    this.logger.debug(`Executing findAllByUserId query for user ID: ${userId}`);
    return this.accountQueryRepository.findAllByUserId(userId);
  }
}
