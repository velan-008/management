import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class SupplierPayment extends Model {}

SupplierPayment.init(
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
    purchase_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    payment_method: {
      type: DataTypes.ENUM('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'),
      allowNull: false,
      defaultValue: 'BANK_TRANSFER'
    },
    reference_number: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    notes: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'supplier_payments',
    timestamps: true,
    underscored: true
  }
);

