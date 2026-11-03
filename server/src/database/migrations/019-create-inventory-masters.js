export const up = async (queryInterface, Sequelize) => {
  const safeAddColumn = async (table, column, definition) => {
    try {
      const description = await queryInterface.describeTable(table);
      if (!description[column]) {
        await queryInterface.addColumn(table, column, definition);
      }
    } catch {
      // Table might not exist or column already exists
    }
  };

  // 1. Add status to categories
  await safeAddColumn('categories', 'status', {
    type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
    allowNull: false,
    defaultValue: 'ACTIVE'
  });

  // 2. Add columns to products
  await safeAddColumn('products', 'image_url', {
    type: Sequelize.TEXT,
    allowNull: true
  });

  await safeAddColumn('products', 'sub_category_id', {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull: true
  });

  await safeAddColumn('products', 'brand_id', {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull: true
  });

  await safeAddColumn('products', 'unit_id', {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull: true
  });

  // 3. Ensure businesses.email allows NULL
  try {
    await queryInterface.changeColumn('businesses', 'email', {
      type: Sequelize.STRING(120),
      allowNull: true
    });
  } catch {}

  const tables = await queryInterface.showAllTables();

  // 4. Create sub_categories table if not exists
  if (!tables.includes('sub_categories')) {
    await queryInterface.createTable('sub_categories', {
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
      category_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE'
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

    await queryInterface.addIndex('sub_categories', ['business_id', 'category_id', 'name'], {
      unique: true,
      name: 'sub_categories_biz_cat_name_unique'
    });
  }

  // 5. Create brands table if not exists
  if (!tables.includes('brands')) {
    await queryInterface.createTable('brands', {
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
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE'
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

    await queryInterface.addIndex('brands', ['business_id', 'name'], {
      unique: true,
      name: 'brands_biz_name_unique'
    });
  }

  // 6. Create units table if not exists
  if (!tables.includes('units')) {
    await queryInterface.createTable('units', {
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
      name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      short_code: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE'
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

    await queryInterface.addIndex('units', ['business_id', 'short_code'], {
      unique: true,
      name: 'units_biz_code_unique'
    });
  }
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('units');
  await queryInterface.dropTable('brands');
  await queryInterface.dropTable('sub_categories');
  await queryInterface.removeColumn('products', 'image_url');
  await queryInterface.removeColumn('products', 'sub_category_id');
  await queryInterface.removeColumn('products', 'brand_id');
  await queryInterface.removeColumn('products', 'unit_id');
  await queryInterface.removeColumn('categories', 'status');
};

