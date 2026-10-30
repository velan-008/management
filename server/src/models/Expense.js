import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class Expense extends Model {}

Expense.init(
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
    category: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0.01
      }
    },
    expense_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    payment_method: {
      type: DataTypes.ENUM('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER'),
      allowNull: false,
      defaultValue: 'BANK_TRANSFER'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    receipt_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    approval_status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'APPROVED'
    }
  },
  {
    sequelize,
    tableName: 'expenses',
    timestamps: true,
    underscored: true
  }
);
