import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class Supplier extends Model {}

Supplier.init(
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
      type: DataTypes.STRING(120),
      allowNull: false
    },
    company_name: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(25),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    gst_number: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    payment_terms: {
      type: DataTypes.STRING(80),
      allowNull: true,
      defaultValue: 'Net 30'
    },
    outstanding_balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'suppliers',
    timestamps: true,
    underscored: true
  }
);

