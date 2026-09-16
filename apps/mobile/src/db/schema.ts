import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const byaparSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'items',
      columns: [
        { name: 'business_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'barcode', type: 'string', isIndexed: true, isOptional: true },
        { name: 'mrp', type: 'number' },
        { name: 'selling_price', type: 'number' },
        { name: 'wholesale_price', type: 'number', isOptional: true },
        { name: 'purchase_cost', type: 'number', isOptional: true },
        { name: 'current_stock', type: 'number' },
        { name: 'low_stock_threshold', type: 'number' },
        { name: 'tax_rate', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'parties',
      columns: [
        { name: 'business_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'party_type', type: 'string' },
        { name: 'credit_limit', type: 'number' },
        { name: 'current_balance', type: 'number' },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'invoices',
      columns: [
        { name: 'business_id', type: 'string', isIndexed: true },
        { name: 'party_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'party_name', type: 'string', isOptional: true },
        { name: 'invoice_number', type: 'string', isIndexed: true },
        { name: 'fiscal_year', type: 'string' },
        { name: 'invoice_date_ad', type: 'string' },
        { name: 'invoice_date_bs', type: 'string' },
        { name: 'total_amount', type: 'number' },
        { name: 'paid_amount', type: 'number' },
        { name: 'due_amount', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'payment_mode', type: 'string' },
        { name: 'cbms_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'khata_entries',
      columns: [
        { name: 'business_id', type: 'string', isIndexed: true },
        { name: 'party_id', type: 'string', isIndexed: true },
        { name: 'party_name', type: 'string', isOptional: true },
        { name: 'invoice_id', type: 'string', isOptional: true },
        { name: 'entry_type', type: 'string' }, // 'liyo' or 'diyo'
        { name: 'amount', type: 'number' },
        { name: 'date_ad', type: 'string' },
        { name: 'date_bs', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number', isIndexed: true },
      ],
    }),
  ],
});
