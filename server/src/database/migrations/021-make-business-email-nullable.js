export const up = async (queryInterface, Sequelize) => {
  try {
    await queryInterface.changeColumn('businesses', 'email', {
      type: Sequelize.STRING(120),
      allowNull: true
    });
  } catch {
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE businesses 
        MODIFY COLUMN email VARCHAR(120) NULL;
      `);
    } catch {}
  }
};

export const down = async (queryInterface, Sequelize) => {
  try {
    await queryInterface.changeColumn('businesses', 'email', {
      type: Sequelize.STRING(120),
      allowNull: true
    });
  } catch {}
};

