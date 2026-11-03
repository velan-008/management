import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class Customer extends Model {}

Customer.init(
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
    email: {
      type: DataTypes.STRING(120),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(25),
      allowNull: true
    },
    tax_number: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    credit_limit: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    outstanding_balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    store_credit: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    customer_type: {
      type: DataTypes.ENUM('RETAIL', 'WHOLESALE', 'REGULAR', 'SUB_WHOLESALER', 'BULK'),
      allowNull: false,
      defaultValue: 'RETAIL'
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE'
    },
    current_outstanding: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.outstanding_balance;
      },
      set(val) {
        this.setDataValue('outstanding_balance', val);
      }
    },
    available_credit: {
      type: DataTypes.VIRTUAL,
      get() {
        const limit = parseFloat(this.credit_limit || 0);
        const outstanding = parseFloat(this.outstanding_balance || 0);
        return Math.max(0, parseFloat((limit - outstanding).toFixed(2)));
      }
    }
  },
  {
    sequelize,
    tableName: 'customers',
    timestamps: true,
    underscored: true
  }
);
