export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('refund_items', {
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
    refund_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'refunds',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    sale_item_id: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'sale_items',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
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
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    unit_selling_price: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    tax_rate: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    total_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    restock: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  });

  await queryInterface.addIndex('refund_items', ['refund_id'], {
    name: 'idx_refund_items_refund_id'
  });

  await queryInterface.addIndex('refund_items', ['product_id'], {
    name: 'idx_refund_items_product_id'
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('refund_items');
};
