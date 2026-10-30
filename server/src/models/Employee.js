import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class Employee extends Model {}

Employee.init(
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
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      unique: true
    },
    first_name: {
      type: DataTypes.STRING(60),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(60),
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
    designation: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    department: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    base_salary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    joining_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'ON_LEAVE', 'TERMINATED'),
      allowNull: false,
      defaultValue: 'ACTIVE'
    }
  },
  {
    sequelize,
    tableName: 'employees',
    timestamps: true,
    underscored: true
  }
);
