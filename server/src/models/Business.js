import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class Business extends Model {}

Business.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: true,
      validate: {
        isEmailIfProvided(value) {
          if (value && typeof value === 'string' && value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value.trim())) {
              throw new Error('Please enter a valid email address');
            }
          }
        }
      }
    },
    phone: {
      type: DataTypes.STRING(25),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tax_number: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Default'
    },
    currency_code: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: 'USD'
    },
    currency_symbol: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: '$'
    }
  },
  {
    sequelize,
    tableName: 'businesses',
    timestamps: true,
    underscored: true
  }
);
