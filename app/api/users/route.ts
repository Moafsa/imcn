import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

// Criação da tabela users (execute no banco se não existir)
// CREATE TABLE IF NOT EXISTS users (
//   id SERIAL PRIMARY KEY,
//   name VARCHAR(100) NOT NULL,
//   email VARCHAR(100) UNIQUE NOT NULL,
//   password_hash VARCHAR(255) NOT NULL,
//   role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'admin', 'user', etc
//   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
// );

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role || 'user';
    await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [name, email, passwordHash, userRole]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User creation error:', error);
    return NextResponse.json({ error: 'Failed to create user', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch users', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 