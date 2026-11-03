import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class Inventory extends Model {}

Inventory.init(
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
    product_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    batch_number: {
      type: DataTypes.STRING(60),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    expiry_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  },
  {
    sequelize,
    tableName: 'inventory',
    timestamps: true,
    underscored: true
  }
);

