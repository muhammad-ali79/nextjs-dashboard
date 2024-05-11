const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection(process.env.DATABASE_URL);

export const executeQuery = async function (query, queryParams = []) {
  return new Promise((resolve, reject) => {
    // connection.query(query, queryParams, callback)

    // Once the MySQL server completes executing the query, it sends the results (if any) back to the Node.js application. The callback function provided to connection.query() is then invoked, allowing you to handle the results or errors asynchronously. If an error occurred during query execution, the error parameter of the callback will contain the error information. If the query executed successfully, the results parameter will contain the query results.
    connection.query(query, queryParams, (error, results, fields) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};

// function to end connection
async function main() {
  await connection.end();
}

// import {
//   CustomerField,
//   CustomersTableType,
//   InvoiceForm,
//   InvoicesTable,
//   LatestInvoiceRaw,
//   User,
//   Revenue,
// } from './definitions';
import { formatCurrency } from './utils';
import { unstable_noStore as noStore } from 'next/cache';

export async function fetchRevenue() {
  // Add noStore() here to prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).

  noStore();

  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    // console.log('Fetching revenue data...');
    // await new Promise((resolve) => setTimeout(resolve, 3000));

    // fetched data from db should be the type of Revenue

    const data = await executeQuery(`SELECT * FROM revenue`);

    // console.log(data);

    // console.log('Data fetch completed after 3 seconds.');

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}
// fetchRevenue();
export async function fetchLatestInvoices() {
  noStore();
  try {
    const dataQuery = `
    SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    ORDER BY invoices.date DESC
    LIMIT 5`;

    const data = await executeQuery(dataQuery);
    console.log('Fetching latest invoice');

    // data.rows is an array of objects so thats why we are able to use the .map
    const latestInvoices = data.map((invoice) => ({
      // spreading the invoice object to make new object
      ...invoice,
      // changing amount to string
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}
// fetchLatestInvoices();

export async function fetchCardData() {
  // console.log('From Card Data');
  noStore();
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = `SELECT COUNT(*) FROM invoices`;
    const customerCountPromise = `SELECT COUNT(*) FROM customers`;

    // this query will return two columns that wil contain the sum of all invoices of status paid and pending
    const invoiceStatusPromise = `SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

    // The correct way to use (promise.all) Promise.all([promise1, promise2]);
    const data = await Promise.all([
      await executeQuery(invoiceCountPromise),
      await executeQuery(customerCountPromise),
      await executeQuery(invoiceStatusPromise),
    ]);

    // console.log(data);
    // if the value of .count is nullish mean (undefined , null) than a default value 0
    const numberOfInvoices = Number(data[0][0]['COUNT(*)'] ?? '0');
    const numberOfCustomers = Number(data[1][0]['COUNT(*)'] ?? '0');
    const totalPaidInvoices = formatCurrency(Number(data[2][0].paid));
    const totalPendingInvoices = formatCurrency(data[2][0].pending ?? '0');

    // await main();
    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}
// fetchCardData();

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(query, currentPage) {
  noStore();
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  // console.log('offset', offset, 'query', query);

  // offset sql syntax will tell how much rows to skip

  try {
    const invoicesQuery = `
    SELECT
      invoices.id,
      invoices.amount,
      invoices.date,
      invoices.status,
      customers.name,
      customers.email,
      customers.image_url
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name LIKE ? OR
      customers.email LIKE ? OR
      invoices.amount LIKE ? OR
      invoices.date LIKE ? OR
      invoices.status LIKE ?
    ORDER BY invoices.date DESC
    LIMIT ? OFFSET ?
  `;

    const invoicesParams = [
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      ITEMS_PER_PAGE,
      offset,
    ];

    const invoices = await executeQuery(invoicesQuery, invoicesParams);
    // console.log(invoices);
    // await main();

    return invoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query) {
  noStore();
  try {
    const countQuery = `
    SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name LIKE ? OR
      customers.email LIKE ? OR
      CAST(invoices.amount AS CHAR) LIKE ? OR
      CAST(invoices.date AS CHAR) LIKE ? OR
      invoices.status LIKE ?
  `;

    const countParams = [
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
    ];
    const count = await executeQuery(countQuery, countParams);
    // console.log(count);

    const totalPages = Math.ceil(Number(count[0]['COUNT(*)']) / ITEMS_PER_PAGE);
    // console.log(totalPages);
    // await main();
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}
// fetchInvoicesPages('paid');

export async function fetchInvoiceById(id) {
  noStore();
  try {
    const dataQuery = `
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = '${id}';
    `;
    const data = await executeQuery(dataQuery);
    // console.log(data);

    const invoice = data.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));
    // console.log(invoice);

    // await main();
    return invoice;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}
// fetchInvoiceById(`'ac3b5bc8-e901-11ee-863b-366a3097e29d'`);

export async function fetchCustomers() {
  try {
    const customersQuery = `
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    const customers = await executeQuery(customersQuery);
    // console.log(customers);
    // await main();
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}
// fetchCustomers();

export async function fetchFilteredCustomers(query) {
  noStore();
  try {
    const filteredCustomersQuery = `
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name LIKE ? OR
      customers.email LIKE ? 
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const filteredCustomersparams = [`%${query}%`, `%${query}%`];
    const data = await executeQuery(
      filteredCustomersQuery,
      filteredCustomersparams,
    );
    // console.log(data);
    const customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));
    // console.log(customers);

    // await main();
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
// fetchFilteredCustomers('mi');

export async function getUser(email) {
  try {
    const userQuery = `SELECT * FROM users WHERE email=${email}`;
    const user = await executeQuery(userQuery);
    // console.log(user[0]);
    // await main();
    return user[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
// getUser(`'user@nextmail.com'`);

// promise.all , group By clause

// group by clause is used when we want to group the data based on common columns in multiple rows so that we can perfrom some operation on this common data
