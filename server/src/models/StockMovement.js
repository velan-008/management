import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class StockMovement extends Model {}

StockMovement.init(
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
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('PURCHASE', 'SALE', 'RETURN', 'DAMAGE', 'ADJUSTMENT'),
      allowNull: false
    },
    quantity_change: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    previous_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    new_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    reference_id: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    notes: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'stock_movements',
    timestamps: true,
    updatedAt: false, // Immutable ledger
    underscored: true
  }
);
