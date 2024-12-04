import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const client = await db.connect();

  try {
    await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    await client.sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone_number VARCHAR(20),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `;

    await client.sql`
    CREATE TABLE IF NOT EXISTS incoming_calls (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id), 
      caller_number VARCHAR(20) NOT NULL,
      caller_name VARCHAR(255) NOT NULL,
      call_category VARCHAR(20) NOT NULL,
      date DATE NOT NULL,
      duration INTEGER NOT NULL,
      hour TIME NOT NULL,
      recording_url TEXT NOT NULL,
      ai_transcript TEXT,
      ai_summary TEXT
    );
    `;

    return NextResponse.json({ message: 'Database seeded successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}