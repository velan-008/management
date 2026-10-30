export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('stock_movements', {
    id: {
      type: Sequelize.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    business_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'businesses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    product_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    user_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    type: {
      type: Sequelize.ENUM('PURCHASE', 'SALE', 'RETURN', 'DAMAGE', 'ADJUSTMENT'),
      allowNull: false
    },
    quantity_change: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    previous_quantity: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    new_quantity: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    reference_id: {
      type: Sequelize.STRING(80),
      allowNull: true
    },
    notes: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  });

  await queryInterface.addIndex('stock_movements', ['business_id', 'product_id', 'created_at'], {
    name: 'idx_stock_prod_date'
  });

  await queryInterface.addIndex('stock_movements', ['business_id', 'type'], {
    name: 'idx_stock_business_type'
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('stock_movements');
};
