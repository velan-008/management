import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class Brand extends Model {}

Brand.init(
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE'
    }
  },
  {
    sequelize,
    tableName: 'brands',
    timestamps: true,
    underscored: true
  }
);

