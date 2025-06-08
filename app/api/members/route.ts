import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

const s3 = new S3Client({
  endpoint: `https://${process.env.S3_ENDPOINT}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
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

export async function POST(req: NextRequest) {
  try {
    console.log('Starting member registration...');
    
    const { fields, files } = await parseForm(req);
    const name = fields.name as string;
    const role = fields.role as string;
    const document = fields.document as string;
    const maritalStatus = fields.marital_status as string;
    const address = fields.address as string;
    const phone = fields.phone as string;
    const email = fields.email as string;
    const city = fields.city as string;
    const congregation = fields.congregation as string;
    const file = files.photo as File;
    
    console.log('Form data:', { name, role, document, maritalStatus, address, phone, email, city, congregation, fileSize: file?.size });
    
    if (!name || !role || !file) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `members/${uuidv4()}.${fileExt}`;
    
    console.log('Uploading to MinIO:', fileName);
    
    try {
      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
        ACL: 'public-read',
      }));
      console.log('Upload successful');
    } catch (uploadError) {
      console.error('MinIO upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }
    
    const photoUrl = `https://${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${fileName}`;
    
    // Buscar validade da carteirinha nas settings
    let cardValidityMonths = 12;
    try {
      const settingsResult = await pool.query('SELECT card_validity FROM settings WHERE id = 1');
      if (settingsResult.rows.length > 0) {
        cardValidityMonths = parseInt(settingsResult.rows[0].card_validity) || 12;
      }
    } catch (e) {
      console.error('Erro ao buscar validade nas settings, usando padrão 12 meses', e);
    }
    const createdAt = new Date();
    const expiresAt = new Date(createdAt);
    expiresAt.setMonth(createdAt.getMonth() + cardValidityMonths);
    
    console.log('Saving to database...');
    
    const baptized = fields.baptized === 'true' || fields.baptized === true ? true : false;
    const baptismDate = fields.baptism_date || null;
    
    let newMemberId = null;
    try {
      const insertResult = await pool.query(
        'INSERT INTO members (name, role, document, marital_status, address, phone, email, city, congregation, photo_url, created_at, expires_at, status, baptized, baptism_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id',
        [name, role, document, maritalStatus, address, phone, email, city, congregation, photoUrl, createdAt, expiresAt, 'Ativo', baptized, baptismDate]
      );
      newMemberId = insertResult.rows[0]?.id;
      console.log('Database save successful');
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to save member data', details: dbError instanceof Error ? dbError.message : dbError }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, photoUrl, id: newMemberId });
  } catch (error) {
    console.error('General error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const result = await pool.query(
      'SELECT * FROM members ORDER BY created_at DESC'
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 