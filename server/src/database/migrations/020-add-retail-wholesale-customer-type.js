export const up = async (queryInterface, Sequelize) => {
  try {
    await queryInterface.changeColumn('customers', 'customer_type', {
      type: Sequelize.ENUM('RETAIL', 'WHOLESALE', 'REGULAR', 'SUB_WHOLESALER', 'BULK'),
      allowNull: false,
      defaultValue: 'RETAIL'
    });
  } catch {
    // If dialect is MySQL, raw ALTER can ensure enum values exist
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE customers 
        MODIFY COLUMN customer_type ENUM('RETAIL', 'WHOLESALE', 'REGULAR', 'SUB_WHOLESALER', 'BULK') 
        NOT NULL DEFAULT 'RETAIL';
      `);
    } catch {}
  }
};

export const down = async (queryInterface, Sequelize) => {
  try {
    await queryInterface.changeColumn('customers', 'customer_type', {
      type: Sequelize.ENUM('REGULAR', 'SUB_WHOLESALER', 'BULK'),
      allowNull: false,
      defaultValue: 'REGULAR'
    });
  } catch {}
};

