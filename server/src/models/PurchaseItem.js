import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class PurchaseItem extends Model {}

PurchaseItem.init(
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
    purchase_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    product_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    product_name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    product_sku: {
      type: DataTypes.STRING(60),
      allowNull: false
    },
    unit_cost_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    quantity_ordered: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    quantity_received: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pcs'
    },
    tax_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    line_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    }
  },
  {
    sequelize,
    tableName: 'purchase_items',
    timestamps: true,
    underscored: true
  }
);

