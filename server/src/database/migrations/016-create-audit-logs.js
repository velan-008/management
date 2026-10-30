export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('audit_logs', {
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
    action: {
      type: Sequelize.STRING(60),
      allowNull: false
    },
    entity: {
      type: Sequelize.STRING(50),
      allowNull: false
    },
    entity_id: {
      type: Sequelize.STRING(50),
      allowNull: true
    },
    changes: {
      type: Sequelize.JSON,
      allowNull: true
    },
    ip_address: {
      type: Sequelize.STRING(45),
      allowNull: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  });

  await queryInterface.addIndex('audit_logs', ['business_id', 'action', 'created_at'], {
    name: 'idx_audit_business_action'
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('audit_logs');
};
