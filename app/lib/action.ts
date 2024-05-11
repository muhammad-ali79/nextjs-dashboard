// Mutating data refers to changing or modifying existing data in some way

// Server funcions
// By adding the 'use server', you mark all the exported functions within the file as server functions. These server functions can then be imported into Client and Server components, making them extremely versatile.

// we are doing additional validation so that we cant get empty data from the form
'use server';
import { z } from 'zod';
import { executeQuery } from '@/app/lib/data.js';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer',
  }),
  // if the amount is an empty string then zod will convert it to zero

  // The amount field is specifically set to coerce (change) from a string to a number while also validating its type.
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than zero' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status',
  }),
  date: z.string(),
});

// he .omit() method in zod allows you to create a new schema that excludes specified fields from an existing schema.
const CreateInvoiceSchema = FormSchema.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {
  // prevState - contains the state passed from the useFormState hook it will be the return value of action

  // if there are 100 of properteis on form then we can use Object.fromEntries(formData.entries())

  const validatedFields = CreateInvoiceSchema.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to create Invoice.',
    };
  }

  // if (!validatedFields.success) {
  //   return {
  //     errors: validatedFields.error.flatten().fieldErrors,
  //     message: 'Missing Fields.Failed to update Inovice.',
  //   };
  // }

  const { customerId, amount, status } = validatedFields.data;
  // It's usually good practice to store monetary values in cents in your database to eliminate JavaScript floating-point errors and ensure greater accuracy.
  const amountInCents = amount * 100;

  // Finally, let's create a new date with the format "YYYY-MM-DD" for the invoice's creation date:
  const date = new Date().toISOString().split('T')[0];
  console.log(prevState);

  try {
    const insertData = `
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES('${customerId}', ${amountInCents} ,'${status}' ,'${date}')
    `;

    await executeQuery(insertData);
  } catch (error) {
    throw new Error('DB ERROR: failed to createInvoice');
  }

  // if we update some data and we are also refreing this data in some route segment so that we need to revalidate that path wehre we want to  see the updated data. because nextjs has prefetching and client-side router cache by default it means that the data is data is prefetched before user come in to the route

  // Once the database has been updated, the /dashboard/invoices path will be revalidated, and fresh data will be fetched from the server.
  console.log(prevState);

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

const updateInvoiceSchema = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = updateInvoiceSchema.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields.Failed to update Inovice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  try {
    const updateQuery = `
    UPDATE invoices
    SET customer_id = '${customerId}', amount = ${amountInCents}, status = '${status}'
    WHERE id = '${id}'
  `;
    await executeQuery(updateQuery);
  } catch (error: any) {
    console.log(error.message);

    throw new Error('DB ERROR: failed to UpdateInvoice');
  }
  // Calling revalidatePath to clear the client cache and make a new server request.
  revalidatePath('/dashboard/invoices');
  // Calling redirect to redirect the user to the invoice's page
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  // throw Error('what going no');
  try {
    const deleteQuery = `
   DELETE FROM invoices WHERE id = '${id}'`;
    await executeQuery(deleteQuery);
  } catch (error) {
    return {
      message: 'DB ERROR: Failed to deleteInvoice',
    };
  }
  // revalidatePath will trigger a new server request and re-render the table.
  revalidatePath('/dashboard/invoices');
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials';

        default:
          return 'Somethign went wrong';
      }
    }
    throw error;
  }
}
