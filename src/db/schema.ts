import type { StockAlertRecord } from '../types/admin.ts';

export const STOCK_ALERTS_TABLE_NAME = 'stock_alerts' as const;

/**
 * Relational DDL definition for the `stock_alerts` table.
 * Enforces a unique constraint per (product_id, variant_id, email) so a user
 * cannot subscribe multiple times for the same out-of-stock item.
 */
export const STOCK_ALERTS_SQL_SCHEMA = `
CREATE TABLE IF NOT EXISTS stock_alerts (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variant_id TEXT DEFAULT '',
  variant_label TEXT,
  email TEXT NOT NULL,
  customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified')),
  created_at TEXT NOT NULL,
  notified_at TEXT,
  UNIQUE (product_id, variant_id, email)
);
`.trim();

export const STOCK_ALERTS_TABLE_SCHEMA = {
  tableName: STOCK_ALERTS_TABLE_NAME,
  primaryKey: 'id',
  uniqueConstraints: [['productId', 'variantId', 'email']] as const,
  columns: {
    id: { type: 'string', required: true },
    productId: { type: 'string', required: true },
    productName: { type: 'string', required: true },
    variantId: { type: 'string', required: false },
    variantLabel: { type: 'string', required: false },
    email: { type: 'string', required: true },
    customerId: { type: 'string', required: false },
    status: { type: 'enum', values: ['pending', 'notified'] as const, default: 'pending' },
    createdAt: { type: 'string', required: true },
    notifiedAt: { type: 'string', required: false },
  },
} as const;

export type StockAlertTableRow = StockAlertRecord;
