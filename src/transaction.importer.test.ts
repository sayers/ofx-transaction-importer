import { setTimeout } from "timers";
import { CreateTransactionHandler, TransactionImporter, ImportStats, UpdateAccountBalanceHandler } from "./transaction.importer";

class CreateTransactionHandlerStub implements CreateTransactionHandler {
    public execute(transaction) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve({ id: -1 });
            }, 100);
        });
    }
}

class UpdateAccountBalanceHandlerStub implements UpdateAccountBalanceHandler {
    public execute(balance) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve({ id: -1 });
            }, 100);
        });
    }
}

describe("import", () => {
    test("importing a file that does not exist should fail", () => {
        expect.assertions(1);
        const createTransaction = new CreateTransactionHandlerStub();
        const updateAccount = new UpdateAccountBalanceHandlerStub();
        const importer = new TransactionImporter(createTransaction, updateAccount);
        return importer.import("file_does_not_exist.ofx")
            .catch(error => {
                expect(error.code).toEqual("ENOENT");
            });
    });

    test("importing a file with fifteen transactions should complete and return a transaction count of fifteen", () => {
        expect.assertions(2);
        const createTransaction = new UpdateAccountBalanceHandlerStub();
        const updateAccount = new UpdateAccountBalanceHandlerStub();
        const importer = new TransactionImporter(createTransaction, updateAccount);
        return importer.import("./tests/tranhist-living-15-valid-transactions.ofx")
            .then((stats: ImportStats) => {
                expect(stats.transactionCount).toEqual(15);
                expect(stats.transactionImportCount).toEqual(15);
            });
    });

    test("importing a file should return the account id", () => {
        expect.assertions(1);
        const createTransaction = new UpdateAccountBalanceHandlerStub();
        const updateAccount = new UpdateAccountBalanceHandlerStub();
        const importer = new TransactionImporter(createTransaction, updateAccount);
        return importer.import("./tests/tranhist-basic.ofx")
            .then((stats: ImportStats) => {
                expect(stats.accountId).toEqual("2584698100");
            });
    });

    test("importing a file should always complete even if an update is rejected", () => {
        expect.assertions(2);
 
        class UpdateTransactionHandlerWithRejection {
            execute(transaction) {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        if (transaction.fitid == "938")
                            reject();
                        resolve({ id: -1 });
                    }, 100);
                });
            }
        }
        
        const createTransaction = new UpdateTransactionHandlerWithRejection();
        const updateAccount = new UpdateAccountBalanceHandlerStub();
        const importer = new TransactionImporter(createTransaction, updateAccount);
        return importer.import("./tests/tranhist-living-15-valid-transactions.ofx")
            .then((stats: ImportStats) => {
                expect(stats.transactionCount).toEqual(15);
                expect(stats.transactionImportCount).toEqual(14);
            });
    });
});