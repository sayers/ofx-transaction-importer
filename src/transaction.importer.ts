const XmlParser = require("node-xml-stream-parser");
const fs = require("fs");

import { OfxBankAccountNode, OfxCreditCardAccountNode, OfxBalanceNode, OfxTransactionNode } from "./ofx.nodes";

class TransactionImporter {
    private createTransactionHandler: CreateTransactionHandler;
    private updateAccountBalanceHandler: UpdateAccountBalanceHandler;

    constructor(createTransactionHandler, updateAccountBalanceHandler) {
        this.createTransactionHandler = createTransactionHandler;
        this.updateAccountBalanceHandler = updateAccountBalanceHandler;
    }

    import(inputFile): Promise<ImportStats> {
        let transactionCount = 0;
        let transactionImportCount = 0;
        let currentNode: {} | null = null;
        let currentChildNode: string | null = null;
        let parser = new XmlParser();
        let accountId = null;
        const transactionElement = "STMTTRN";
        const credCardAccountElement = "CCACCTFROM";
        const bankAccountElement = "BANKACCTFROM";
        const balanceElement = "AVAILBAL";

        const transactionStream = fs.createReadStream(inputFile);
        transactionStream
            .pipe(parser);

        parser.on("opentag", (name, attrs) => {
            if ((name === transactionElement) || (name === credCardAccountElement) || (name === bankAccountElement) || (name === balanceElement)) {
                currentNode = {
                    
                };
            }
            else if (currentNode !== null){
                currentNode[name] = "";
                currentChildNode = name;
            }
        });
        parser.on("text", text => {
            if (currentChildNode !== null) {
                currentNode[currentChildNode] = text;
            }
        });
        const pendingUpdates: Promise<any>[] = [];

        parser.on("closetag", name => {
            if (name === transactionElement) {
                const transactionNode = <OfxTransactionNode>currentNode;
                let year = Number(transactionNode.DTPOSTED.substring(0,4));
                let month = Number(transactionNode.DTPOSTED.substring(4,6)) - 1;
                let day = Number(transactionNode.DTPOSTED.substring(6,8));
                let transaction = {
                    fitid: transactionNode.FITID,
                    date:  new Date(year, month, day),
                    amount: transactionNode.TRNAMT,
                    payee: transactionNode.NAME,
                    particulars: transactionNode.MEMO,
                    accountId: accountId
                };

                currentNode = null;
                transactionCount++;
                pendingUpdates.push(new Promise<any>((resolve, reject) => {
                    this.createTransactionHandler.execute(transaction)
                        .then(data => {
                            transactionImportCount++;
                            resolve();
                        })
                        .catch((err) => {
                            resolve();
                        });
                }));
            }
            else if (name === credCardAccountElement) {
                accountId = (<OfxCreditCardAccountNode>currentNode).ACCTID;
            }
            else if (name === bankAccountElement) {
                accountId = (<OfxBankAccountNode>currentNode).ACCTID;
            }
            else if (name === balanceElement) {
                //20180904220635[+12:NZST]
                const balanceNode = <OfxBalanceNode>currentNode;
                const year = Number(balanceNode.DTASOF.substring(0,4));
                const month = Number(balanceNode.DTASOF.substring(4,6)) - 1;
                const day = Number(balanceNode.DTASOF.substring(6,8));
                const hour = Number(balanceNode.DTASOF.substring(8,10));
                const minute = Number(balanceNode.DTASOF.substring(10,12));
                const second = Number(balanceNode.DTASOF.substring(12,14));
                const balanceUpdate = {
                    accountId: accountId,
                    balance: balanceNode.BALAMT,
                    date: new Date(year, month, day, hour, minute, second),
                };
                pendingUpdates.push(new Promise<any>((resolve, reject) => {
                    this.updateAccountBalanceHandler.execute(balanceUpdate)
                        .then(data => {
                            resolve();
                        })
                        .catch((err) => {
                            resolve();
                        });
                }));
            }
            else if(currentChildNode !== null)
              currentChildNode = null;
            
        });
        const importPromise = new Promise<ImportStats>((resolve, reject) => {
            parser.on("finish", () => {
                Promise.all(pendingUpdates)
                    .then(result => {
                        resolve({
                            accountId,
                            transactionCount,
                            transactionImportCount
                        });
                    });                
            });
            parser.on("error", (error) => {
                reject(error);
            });
            transactionStream.on("error", (error) => {
                reject(error);
            });
        });

        return importPromise;
    }  
}

interface ImportStats {
    accountId: string,
    transactionCount: number,
    transactionImportCount: number
}

interface CreateTransactionHandler {
    execute(transaction: any): Promise<any>
}

interface UpdateAccountBalanceHandler {
    execute(balanceUpdate: any): Promise<any>
}

export { CreateTransactionHandler, ImportStats, TransactionImporter, UpdateAccountBalanceHandler };