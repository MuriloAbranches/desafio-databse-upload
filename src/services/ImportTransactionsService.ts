import fs from 'fs';
import csvParse from 'csv-parse';
import { getRepository, In } from 'typeorm';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface TransactionCsv {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute(path: string): Promise<Transaction[]> {
    const readStream = fs.createReadStream(path);

    const parsers = csvParse({ from_line: 2 });

    const parseCsv = readStream.pipe(parsers);

    const transactions: TransactionCsv[] = [];
    const categoriesCsv: string[] = [];

    parseCsv.on('data', async data => {
      const [title, type, value, category] = data.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !value || !type || !category) return;

      categoriesCsv.push(category);
      transactions.push({ title, value, type, category });
    });

    await new Promise(resolve => parseCsv.on('end', resolve));

    const categoriesRepository = getRepository(Category);

    const categoriesExists = await categoriesRepository.find({
      where: {
        title: In(categoriesCsv),
      },
    });

    const categoriesTitles = categoriesExists.map(
      (category: Category) => category.title,
    );

    const categories = categoriesCsv
      .filter(category => !categoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      categories.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const transactionRepository = getRepository(Transaction);

    const allCategories = [...newCategories, ...categoriesExists];

    const newTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(newTransactions);

    await fs.promises.unlink(path);

    return newTransactions;
  }
}

export default ImportTransactionsService;
