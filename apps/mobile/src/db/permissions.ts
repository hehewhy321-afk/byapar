export interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  permissions: { id: string; label: string }[];
}

export const STAFF_ROLES = [
  'Partner',
  'Manager',
  'Accountant',
  'Sales Person',
  'Stock Manager',
  'Entry Person',
] as const;

export type StaffRole = typeof STAFF_ROLES[number];

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'sales_vouchers',
    name: 'Sales Vouchers (Sales, Quotation, Payment In, Sales Return, Other Income)',
    permissions: [
      { id: 'create_sale', label: 'Create Sale' },
      { id: 'delete_sale', label: 'Delete Sale' },
      { id: 'edit_sale', label: 'Edit Sale' },
      { id: 'view_sale', label: 'View Sale' },
    ],
  },
  {
    id: 'purchase_vouchers',
    name: 'Purchase Vouchers (Purchase, Payment Out, Purchase Return)',
    permissions: [
      { id: 'create_purchase', label: 'Create Purchase' },
      { id: 'delete_purchase', label: 'Delete Purchase' },
      { id: 'edit_purchase', label: 'Edit Purchase' },
      { id: 'view_purchase', label: 'View Purchase' },
    ],
  },
  {
    id: 'income_expenses',
    name: 'Income & Expenses',
    permissions: [
      { id: 'create_income_expense', label: 'Create Income Expense' },
      { id: 'delete_income_expense', label: 'Delete Income Expense' },
      { id: 'edit_income_expense', label: 'Edit Income Expense' },
      { id: 'view_income_expense', label: 'View Income Expense' },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory (Item, Category)',
    permissions: [
      { id: 'create_item', label: 'Create Item' },
      { id: 'delete_item', label: 'Delete Item' },
      { id: 'edit_delete_item_category', label: 'Edit Delete Item Category' },
      { id: 'edit_item', label: 'Edit Item' },
      { id: 'view_item', label: 'View Item' },
      { id: 'view_item_category', label: 'View Item Category' },
    ],
  },
  {
    id: 'stock_adjustments',
    name: 'Stock Adjustments',
    permissions: [
      { id: 'create_adjustments', label: 'Create Adjustments' },
      { id: 'delete_adjustments', label: 'Delete Adjustments' },
      { id: 'edit_adjustments', label: 'Edit Adjustments' },
    ],
  },
  {
    id: 'customers',
    name: 'Customers',
    permissions: [
      { id: 'create_customer', label: 'Create Customer' },
      { id: 'delete_customer', label: 'Delete Customer' },
      { id: 'edit_customer', label: 'Edit Customer' },
      { id: 'view_customer', label: 'View Customer' },
    ],
  },
  {
    id: 'suppliers',
    name: 'Suppliers',
    permissions: [
      { id: 'create_supplier', label: 'Create Supplier' },
      { id: 'delete_supplier', label: 'Delete Supplier' },
      { id: 'edit_supplier', label: 'Edit Supplier' },
      { id: 'view_supplier', label: 'View Supplier' },
    ],
  },
  {
    id: 'app_features',
    name: 'App Features',
    permissions: [
      { id: 'import_bulk', label: 'Import Bulk' },
      { id: 'use_business_cards', label: 'Use Business Cards' },
      { id: 'use_greeting_cards', label: 'Use Greeting Cards' },
    ],
  },
  {
    id: 'manage_staffs',
    name: 'Manage Staffs',
    permissions: [
      { id: 'create_staff', label: 'Create Staff' },
      { id: 'delete_staff', label: 'Delete Staff' },
      { id: 'edit_staff', label: 'Edit Staff' },
      { id: 'view_staff', label: 'View Staff' },
    ],
  },
  {
    id: 'business_settings',
    name: 'Business Settings',
    permissions: [
      { id: 'edit_business', label: 'Edit Business' },
      { id: 'edit_invoice_settings', label: 'Edit Invoice Settings' },
      { id: 'edit_item_settings', label: 'Edit Item Settings' },
      { id: 'edit_party_settings', label: 'Edit Party Settings' },
      { id: 'edit_transaction_settings', label: 'Edit Transaction Settings' },
      { id: 'delete_business', label: 'Delete Business' },
    ],
  },
  {
    id: 'manage_accounts',
    name: 'Manage Accounts (Bank, Wallet)',
    permissions: [
      { id: 'add_account', label: 'Add Account' },
      { id: 'create_transaction_adjustment', label: 'Create Transaction Adjustment' },
      { id: 'delete_account', label: 'Delete Account' },
      { id: 'edit_account', label: 'Edit Account' },
      { id: 'edit_delete_transaction_adjustment', label: 'Edit Delete Transaction Adjustment' },
      { id: 'view_account', label: 'View Account' },
    ],
  },
  {
    id: 'reports',
    name: 'Reports',
    permissions: [
      { id: 'view_business_status_reports', label: 'View Business Status Reports' },
      { id: 'view_homepage_stats', label: 'View Homepage Stats' },
      { id: 'view_income_expense_reports', label: 'View Income Expense Reports' },
      { id: 'view_item_reports', label: 'View Item Reports' },
      { id: 'view_party_reports', label: 'View Party Reports' },
      { id: 'view_transaction_reports', label: 'View Transaction Reports' },
    ],
  },
  {
    id: 'notebook',
    name: 'Notebook',
    permissions: [
      { id: 'create_notebook', label: 'Create Notebook' },
      { id: 'view_notebook', label: 'View Notebook' },
      { id: 'delete_notebook', label: 'Delete Notebook' },
      { id: 'edit_notebook', label: 'Edit Notebook' },
    ],
  },
  {
    id: 'other_permissions',
    name: 'Other Permissions',
    permissions: [
      { id: 'manage_party_adjustments', label: 'Manage Party Adjustments' },
      { id: 'hide_purchase_price', label: 'Hide Purchase Price' },
      { id: 'lock_transaction_date', label: 'Lock Transaction Date' },
    ],
  },
];

export function getDefaultRolePermissions(role: StaffRole): Record<string, boolean> {
  const permMap: Record<string, boolean> = {};
  const allIds = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.id));

  if (role === 'Partner' || role === 'Manager') {
    allIds.forEach((id) => {
      permMap[id] = true;
    });
    if (role === 'Manager') {
      permMap['delete_business'] = false;
    }
  } else if (role === 'Accountant') {
    allIds.forEach((id) => {
      if (
        id.includes('sale') ||
        id.includes('purchase') ||
        id.includes('income') ||
        id.includes('account') ||
        id.includes('report') ||
        id.includes('customer') ||
        id.includes('supplier')
      ) {
        permMap[id] = true;
      }
    });
  } else if (role === 'Sales Person') {
    permMap['create_sale'] = true;
    permMap['view_sale'] = true;
    permMap['edit_sale'] = true;
    permMap['view_item'] = true;
    permMap['create_customer'] = true;
    permMap['view_customer'] = true;
    permMap['use_business_cards'] = true;
    permMap['use_greeting_cards'] = true;
  } else if (role === 'Stock Manager') {
    permMap['create_item'] = true;
    permMap['edit_item'] = true;
    permMap['view_item'] = true;
    permMap['create_adjustments'] = true;
    permMap['edit_adjustments'] = true;
    permMap['create_purchase'] = true;
    permMap['view_purchase'] = true;
    permMap['view_supplier'] = true;
  } else if (role === 'Entry Person') {
    permMap['create_sale'] = true;
    permMap['view_sale'] = true;
    permMap['create_purchase'] = true;
    permMap['view_purchase'] = true;
    permMap['create_item'] = true;
    permMap['create_customer'] = true;
    permMap['create_supplier'] = true;
  }

  return permMap;
}
