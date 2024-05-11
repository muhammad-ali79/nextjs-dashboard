const mysql = require('mysql2');
const {
  invoices,
  customers,
  revenue,
  users,
} = require('../app/lib/placeholder-data.js');
const bcrypt = require('bcrypt');
require('dotenv').config();

const connection = mysql.createConnection(process.env.DATABASE_URL);

async function connectDatabase(connection) {
  return new Promise((resolve, reject) => {
    connection.connect((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Connected to database as id ' + connection.threadId);
        resolve();
      }
    });
  });
}
connectDatabase(connection);

const executeQuery = async function (connection, query) {
  return new Promise((resolve, reject) => {
    connection.query(query, (error, results, fields) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
};

const seedUsers = async function () {
  try {
    const UserTable = `
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) DEFAULT (UUID()) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255)  NOT NULL UNIQUE,
      password TEXT NOT NULL
  );
    `;

    await executeQuery(connection, UserTable);
    console.log(`"USER" table created`);

    // i use the promise.all to resolve the promises reutrn by map funcion(which indicate the insertion of user in db ) so that i can return their results in the fuction end
    const insertedUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const insertUsersQuery = `
      INSERT INTO users (name, email, password)
      VALUES ('${user.name}', '${user.email}', '${hashedPassword}')
      ;`;
        return await executeQuery(connection, insertUsersQuery);
      }),
    );

    console.log(`${insertedUsers.length} "USERS" inserted`);
    console.log(insertedUsers);

    return {
      UserTable,
      users: insertedUsers,
    };
  } catch (error) {
    console.error('Error seeding users', error.message);
    throw error;
  }
};

const seedInvoices = async () => {
  try {
    const invoicesTable = `
    CREATE TABLE IF NOT EXISTS invoices (
    id CHAR(36) DEFAULT (UUID()) PRIMARY KEY,
    customer_id CHAR(36) NOT NULL,
    amount INT NOT NULL,
    status VARCHAR(255) NOT NULL,
    date DATE NOT NULL
  );
`;

    await executeQuery(connection, invoicesTable);
    console.log('INVOCES table created');

    const insertedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        const insertInvoicesQuery = `
        INSERT INTO invoices (customer_id, amount ,status, date)
        VALUES('${invoice.customer_id}', ${invoice.amount} , '${invoice.status}' , '${invoice.date}');
      `;

        console.log('results', insertInvoicesQuery);
        const results = await executeQuery(connection, insertInvoicesQuery);
        return results;
      }),
    );

    console.log(insertedInvoices, insertedInvoices.length);
    console.log(`seeded ${insertedInvoices.length} invoices`);

    return {
      invoicesTable,
      invoices: insertedInvoices,
    };
  } catch (error) {
    console.log('Error seeding INVOICES', error.message);
    throw error;
  }
};

const seedCustomers = async () => {
  try {
    const customerTable = `
    CREATE TABLE IF NOT EXISTS customers (
      id CHAR(36) DEFAULT (UUID()) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;
    await executeQuery(connection, customerTable);

    console.log(`Created "customers" table`);

    // Insert data into the "customers" table
    const insertedCustomers = await Promise.all(
      customers.map(async (customer) => {
        const insertCustomersQuery = `
        INSERT INTO customers (id, name, email, image_url)
        VALUES ('${customer.id}', '${customer.name}', '${customer.email}', '${customer.image_url}');
        `;

        console.log(
          customer.id,
          customer.name,
          customer.email,
          customer.image_url,
        );
        return await executeQuery(connection, insertCustomersQuery);
      }),
    );
    console.log(`Seeded ${insertedCustomers.length} customers`);
    console.log(insertedCustomers, insertedCustomers.length);

    return {
      customerTable,
      customers: insertedCustomers,
    };
  } catch (error) {
    console.log('Error seeding customer');
    throw error;
  }
};

const seedRevenue = async () => {
  try {
    const revenueTable = `
    CREATE TABLE IF NOT EXISTS revenue(
      id CHAR(36) DEFAULT (UUID()) PRIMARY KEY,
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
      )
    `;

    await executeQuery(connection, revenueTable);
    console.log(`Created "revenue" table`);

    // Insert data into the "revenue" table
    const insertedRevenue = await Promise.all(
      revenue.map(async (rev) => {
        const insertRevenueQuery = `
        INSERT INTO revenue (month, revenue)
        VALUES ('${rev.month}', ${rev.revenue});
      `;

        return await executeQuery(connection, insertRevenueQuery);
      }),
    );
    console.log('Revenue returened ', insertedRevenue);
    console.log(`Seeded ${insertedRevenue.length} revenue`);

    return {
      revenueTable,
      revenue: insertedRevenue,
    };
  } catch (error) {
    console.log('Error seeding revenues', error.message);
    throw error;
  }
};

async function main() {
  try {
    await seedUsers();

    await seedInvoices();

    await seedCustomers();

    await seedRevenue();
  } catch (error) {
    console.log('An error errecourd while seeding the db');
    throw error;
  } finally {
    await connection.end();
    console.log('connection closed');
  }
}
main();

// sql string values should wrap them in single quote
module.exports = { connection, executeQuery };
