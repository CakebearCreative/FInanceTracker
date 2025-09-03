import Dexie, { type Table } from 'dexie';

export interface Account {
  id?: number;
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'credit';
  bank: string;
  currency: 'SEK' | 'EUR' | 'USD';
  createdAt: Date;
}

export interface Asset {
  id?: number;
  accountId: number;
  name: string;
  type: 'stock' | 'index' | 'bond' | 'cash' | 'crypto' | 'savings' | 'other';
  symbol?: string;
  exchange?: string; // e.g., 'STO' for Stockholm, 'NYSE', 'NASDAQ'
  currentPrice: number; // Price per unit
  currentValue: number; // Total value (price * quantity)
  initialPrice: number; // Initial price per unit
  initialValue: number; // Total initial value
  quantity: number;
  currency: 'SEK' | 'EUR' | 'USD';
  autoUpdate: boolean; // Whether to fetch live prices
  interestRate?: number; // Annual interest rate for savings accounts (%)
  lastPriceUpdate?: Date;
  purchaseDate?: Date; // When the asset was purchased
  createdAt: Date;
  updatedAt: Date;
}

export interface RealEstate {
  id?: number;
  name: string;
  type: 'apartment' | 'house' | 'commercial' | 'land';
  currentValue: number;
  initialValue: number;
  loanAmount: number; // Outstanding mortgage/loan
  currency: 'SEK' | 'EUR' | 'USD';
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RealEstateHistory {
  id?: number;
  realEstateId: number;
  value: number;
  loanAmount: number;
  date: Date;
}

export interface ValueHistory {
  id?: number;
  assetId: number;
  value: number; // Total investment value at this point
  price: number; // Price per unit at this point
  date: Date;
}

export interface PriceHistory {
  id?: number;
  symbol: string;
  exchange: string;
  price: number;
  currency: string;
  date: Date;
}

export interface Transaction {
  id?: number;
  assetId: number;
  type: 'buy' | 'sell';
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
  date: Date;
  notes?: string;
  createdAt: Date;
}

export class FinanceDB extends Dexie {
  accounts!: Table<Account>;
  assets!: Table<Asset>;
  valueHistory!: Table<ValueHistory>;
  priceHistory!: Table<PriceHistory>;
  transactions!: Table<Transaction>;
  realEstate!: Table<RealEstate>;
  realEstateHistory!: Table<RealEstateHistory>;

  constructor() {
    super('FinanceTrackerDB');
    this.version(3).stores({
      accounts: '++id, name, type, bank, currency, createdAt',
      assets: '++id, accountId, name, type, symbol, exchange, currentPrice, currentValue, initialPrice, initialValue, quantity, currency, autoUpdate, interestRate, lastPriceUpdate, purchaseDate, createdAt, updatedAt',
      valueHistory: '++id, assetId, value, price, date',
      priceHistory: '++id, symbol, exchange, price, currency, date',
      transactions: '++id, assetId, type, quantity, pricePerUnit, totalValue, date, notes, createdAt',
      realEstate: '++id, name, type, currentValue, initialValue, loanAmount, currency, address, createdAt, updatedAt',
      realEstateHistory: '++id, realEstateId, value, loanAmount, date'
    });
  }
}

export const db = new FinanceDB();
