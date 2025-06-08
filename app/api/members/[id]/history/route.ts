import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

export async function GET(req: NextRequest) {
  // Extrai o id manualmente da URL
  const url = new URL(req.url);
  const id = url.pathname.split("/").filter(Boolean).pop();

  try {
    const result = await pool.query(
      'SELECT change_type, old_value, new_value, changed_at FROM member_history WHERE member_id = $1 ORDER BY changed_at DESC',
      [id]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
} 