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
      ai_summary TEXT,
      callee_number VARCHAR(20),
      call_status VARCHAR(20)
    );
    `;

    await client.sql`
    CREATE TABLE IF NOT EXISTS ai_agents (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        voice VARCHAR(50) NOT NULL,
        language VARCHAR(50) NOT NULL,
        personality VARCHAR(50) NOT NULL,
        speed FLOAT NOT NULL,
        call_type VARCHAR(50) NOT NULL,
        knowledge_base_path TEXT,
        knowledge_base_type VARCHAR(50),
        llm_prompt TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        user_id UUID REFERENCES users(id)
    );
    `;

    await client.sql`
    CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,  -- 'brouillon', 'planifiée', 'en-cours', 'terminée'
    phone_number_id UUID REFERENCES phone_numbers(id),
    agent_id UUID REFERENCES ai_agents(id),
    contacts_file_path TEXT,
    contacts_count INTEGER,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id)
);
`;

    await client.sql`
    CREATE TABLE IF NOT EXISTS phone_numbers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        number VARCHAR(20) NOT NULL,
        type VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        user_id UUID REFERENCES users(id),
        agent_id UUID REFERENCES ai_agents(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `;


    return NextResponse.json({ message: 'Database seeded successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}