import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const id = segments[segments.length - 2];

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "Invalid member id" }, { status: 400 });
  }

  try {
    console.log("Buscando histórico para o membro:", id);
    const result = await pool.query(
      'SELECT change_type, old_value, new_value, changed_at FROM member_history WHERE member_id = $1 ORDER BY changed_at DESC',
      [id]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 