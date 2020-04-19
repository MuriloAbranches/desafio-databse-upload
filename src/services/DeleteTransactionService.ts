import { getRepository } from 'typeorm';

import Transaction from '../models/Transaction';

import AppError from '../errors/AppError';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionRepository = getRepository(Transaction);

    const transaction = transactionRepository.findOne(id);

    if (!transaction) {
      throw new AppError('Transaction does not exists.');
    }

    await transactionRepository.delete(id);
  }
}

export default DeleteTransactionService;
