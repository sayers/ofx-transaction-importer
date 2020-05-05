export interface OfxTransactionNode {
    TRNTYPE: string;
    DTPOSTED: string;
    TRNAMT: string;
    FITID: string;
    NAME: string;
    MEMO: string;
}

export interface OfxBalanceNode {
    BALAMT: string;
    DTASOF: string;
}

export interface OfxAccountNode {
    ACCTID: number;
}

export interface OfxCreditCardAccountNode extends OfxAccountNode {
}

export interface OfxBankAccountNode extends OfxAccountNode {
    BANKID: number;
    ACCTTYPE: string;
}