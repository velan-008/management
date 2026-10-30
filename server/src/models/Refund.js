import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class Refund extends Model {}

Refund.init(
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
    sale_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    customer_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    refund_number: {
      type: DataTypes.STRING(60),
      allowNull: false
    },
    refund_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    subtotal_refunded: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax_refunded: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    total_refunded: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    refund_method: {
      type: DataTypes.ENUM('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'STORE_CREDIT', 'ADJUSTMENT'),
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'refunds',
    timestamps: true,
    underscored: true
  }
);
