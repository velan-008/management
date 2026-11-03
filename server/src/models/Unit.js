import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class Unit extends Model {}

Unit.init(
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
      type: DataTypes.STRING(50),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(20),
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
    tableName: 'units',
    timestamps: true,
    underscored: true
  }
);

