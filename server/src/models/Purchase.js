import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class Purchase extends Model {}

Purchase.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    business_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    supplier_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    invoice_number: {
      type: DataTypes.STRING(60),
      allowNull: false
    },
    purchase_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('ORDERED', 'RECEIVED', 'PARTIALLY_RECEIVED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'ORDERED'
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    discount_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    freight_charges: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    grand_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    paid_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    balance_due: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    payment_status: {
      type: DataTypes.ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID'),
      allowNull: false,
      defaultValue: 'UNPAID'
    },
    payment_method: {
      type: DataTypes.STRING(40),
      allowNull: true,
      defaultValue: 'BANK_TRANSFER'
    },
    notes: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'purchases',
    timestamps: true,
    underscored: true
  }
);

