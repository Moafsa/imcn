import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

const s3 = new S3Client({
  endpoint: `https://${process.env.S3_ENDPOINT}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

async function parseForm(req: NextRequest) {
  const formData = await req.formData();
  const fields: any = {};
  const files: any = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'object' && value !== null && typeof value.arrayBuffer === 'function') {
      files[key] = value;
    } else {
      fields[key] = value;
    }
  }
  return { fields, files };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").filter(Boolean).pop();
  // ... restante do código GET, usando o id ...
}

export async function PUT(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").filter(Boolean).pop();
  try {
    let isMultipart = req.headers.get('content-type')?.includes('multipart/form-data');
    let fields: any = {};
    let files: any = {};
    if (isMultipart) {
      ({ fields, files } = await parseForm(req));
    } else {
      fields = await req.json();
    }
    const {
      name, role, document, marital_status, address, phone, email, city, congregation, status, baptized, baptism_date
    } = fields;
    let photoUrl = fields.photo_url;
    // Buscar dados antigos para histórico
    const oldResult = await pool.query('SELECT role, status, marital_status FROM members WHERE id = $1', [id]);
    const old = oldResult.rows[0] || {};
    // Buscar foto anterior se não houver novo upload
    if (!files.photo) {
      const result = await pool.query('SELECT photo_url FROM members WHERE id = $1', [id]);
      if (result.rows.length > 0) {
        photoUrl = result.rows[0].photo_url;
      }
    }
    // Se houver nova foto, faz upload para o MinIO
    if (files.photo) {
      const file = files.photo;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `members/${uuidv4()}.${fileExt}`;
      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
        ACL: 'public-read',
      }));
      photoUrl = `https://${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${fileName}`;
    }
    await pool.query(
      `UPDATE members SET
        name = $1,
        role = $2,
        document = $3,
        marital_status = $4,
        address = $5,
        phone = $6,
        email = $7,
        city = $8,
        congregation = $9,
        photo_url = $10,
        status = $11,
        baptized = $12,
        baptism_date = $13
      WHERE id = $14`,
      [name, role, document, marital_status, address, phone, email, city, congregation, photoUrl, status, baptized === 'true' || baptized === true, baptism_date || null, id]
    );
    // Histórico de status
    if (old.status !== status) {
      await pool.query('INSERT INTO member_history (member_id, change_type, old_value, new_value) VALUES ($1, $2, $3, $4)', [id, 'status', old.status, status]);
    }
    // Histórico de cargo
    if (old.role !== role) {
      await pool.query('INSERT INTO member_history (member_id, change_type, old_value, new_value) VALUES ($1, $2, $3, $4)', [id, 'cargo', old.role, role]);
    }
    // Histórico de estado civil
    if (old.marital_status !== marital_status) {
      await pool.query('INSERT INTO member_history (member_id, change_type, old_value, new_value) VALUES ($1, $2, $3, $4)', [id, 'estado_civil', old.marital_status, marital_status]);
    }
    return NextResponse.json({ success: true, photoUrl });
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json({ error: 'Failed to update member', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").filter(Boolean).pop();
  try {
    // Excluir históricos relacionados antes de excluir o membro
    await pool.query('DELETE FROM member_history WHERE member_id = $1', [id]);
    await pool.query('DELETE FROM members WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir membro:', error);
    return NextResponse.json({ error: 'Erro ao excluir membro' }, { status: 500 });
  }
} 