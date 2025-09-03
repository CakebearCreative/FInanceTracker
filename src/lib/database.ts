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
  value: number;
  date: Date;
}

export class FinanceDB extends Dexie {
  accounts!: Table<Account>;
  assets!: Table<Asset>;
  valueHistory!: Table<ValueHistory>;
  realEstate!: Table<RealEstate>;
  realEstateHistory!: Table<RealEstateHistory>;

  constructor() {
    super('FinanceTrackerDB');
    this.version(1).stores({
      accounts: '++id, name, type, bank, currency, createdAt',
      assets: '++id, accountId, name, type, symbol, exchange, currentPrice, currentValue, initialPrice, initialValue, quantity, currency, autoUpdate, interestRate, lastPriceUpdate, createdAt, updatedAt',
      valueHistory: '++id, assetId, value, date',
      realEstate: '++id, name, type, currentValue, initialValue, loanAmount, currency, address, createdAt, updatedAt',
      realEstateHistory: '++id, realEstateId, value, loanAmount, date'
    });
  }
}

export const db = new FinanceDB();
