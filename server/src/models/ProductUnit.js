import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class ProductUnit extends Model {}

ProductUnit.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    product_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    unit_name: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    conversion_factor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1.00,
      validate: {
        min: 0.01
      }
    },
    wholesale_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    retail_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    }
  },
  {
    sequelize,
    tableName: 'product_units',
    timestamps: true,
    underscored: true
  }
);

