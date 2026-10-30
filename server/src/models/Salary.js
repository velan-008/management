import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class Salary extends Model {}

Salary.init(
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
    employee_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    month: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      validate: {
        min: 1,
        max: 12
      }
    },
    year: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false
    },
    base_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    bonus_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    deductions: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    net_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    payment_status: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING'
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    payment_method: {
      type: DataTypes.ENUM('BANK_TRANSFER', 'CASH', 'CHEQUE', 'OTHER'),
      allowNull: false,
      defaultValue: 'BANK_TRANSFER'
    },
    notes: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'salaries',
    timestamps: true,
    underscored: true
  }
);
