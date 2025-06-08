import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

export async function GET(req: NextRequest) {
  try {
    // Total members
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM members');
    const totalMembers = parseInt(totalResult.rows[0].total);

    // Today's registrations
    const todayResult = await pool.query(
      `SELECT COUNT(*) as total FROM members 
       WHERE DATE(created_at) = CURRENT_DATE`
    );
    const todayRegistrations = parseInt(todayResult.rows[0].total);

    // Expiring cards (within 30 days)
    const expiringResult = await pool.query(
      `SELECT COUNT(*) as total FROM members 
       WHERE expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`
    );
    const expiringCards = parseInt(expiringResult.rows[0].total);

    return NextResponse.json({
      totalMembers,
      todayRegistrations,
      expiringCards
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 