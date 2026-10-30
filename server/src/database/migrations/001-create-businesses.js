export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('businesses', {
    id: {
      type: Sequelize.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: Sequelize.STRING(150),
      allowNull: false
    },
    email: {
      type: Sequelize.STRING(120),
      allowNull: false
    },
    phone: {
      type: Sequelize.STRING(25),
      allowNull: true
    },
    address: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    tax_number: {
      type: Sequelize.STRING(50),
      allowNull: true
    },
    state: {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'Default'
    },
    currency_code: {
      type: Sequelize.STRING(5),
      allowNull: false,
      defaultValue: 'USD'
    },
    currency_symbol: {
      type: Sequelize.STRING(5),
      allowNull: false,
      defaultValue: '$'
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('businesses');
};
