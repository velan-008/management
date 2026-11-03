import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database/connection.js';

export class Product extends Model {}

Product.init(
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
    category_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    sku: {
      type: DataTypes.STRING(60),
      allowNull: false
    },
    barcode: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cost_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    selling_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    retail_price: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.selling_price;
      },
      set(val) {
        this.setDataValue('selling_price', val);
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    low_stock_threshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5
    },
    tax_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pcs'
    },
    wholesale_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    brand: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    batch_number: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    expiry_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    carton_pack_qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    base_unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PCS'
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE'
    },
    sub_category_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    brand_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    unit_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    image_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'products',
    timestamps: true,
    underscored: true
  }
);
