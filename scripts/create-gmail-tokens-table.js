const { db } = require('@vercel/postgres');

async function createGmailTokensTable() {
  const client = await db.connect();

  try {
    console.log('Creating gmail_tokens table...');

    // Create the gmail_tokens table
    await client.sql`
      CREATE TABLE IF NOT EXISTS gmail_tokens (
        id SERIAL PRIMARY KEY,
        user_email TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expiry_date BIGINT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_email)
      );
    `;

    console.log('gmail_tokens table created successfully!');
  } catch (error) {
    console.error('Error creating gmail_tokens table:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createGmailTokensTable();
  } catch (error) {
    console.error('An error occurred during the database setup:', error);
  }
}

main(); 