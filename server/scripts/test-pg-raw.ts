import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

console.log('Testing with pg client, DATABASE_URL:', process.env.DATABASE_URL);

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();
    console.log('pg client connected successfully!');
    const res = await client.query('SELECT current_database(), current_user, now()');
    console.log('Query result:', res.rows[0]);
    await client.end();
  } catch (err: any) {
    console.error('pg client connection error:', err.message, err.code, err);
  }
}

run();
