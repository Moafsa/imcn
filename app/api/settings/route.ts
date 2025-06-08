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

// Criação da tabela settings (execute no banco se não existir)
// CREATE TABLE IF NOT EXISTS settings (
//   id SERIAL PRIMARY KEY,
//   church_name VARCHAR(100) NOT NULL,
//   address VARCHAR(150) NOT NULL,
//   city VARCHAR(100) NOT NULL,
//   card_validity INTEGER NOT NULL,
//   logo_url VARCHAR(255)
// );

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
    const { fields, files } = await parseForm(req);
    console.log('FILES:', Object.keys(files), files.logo ? files.logo.name : 'NO LOGO');
    const churchName = fields.churchName as string;
    const address = fields.address as string;
    const city = fields.city as string;
    const cardValidity = parseInt(fields.cardValidity || '12', 10); // meses
    let logoUrl = fields.logoUrl || '';

    // Buscar logo anterior se não houver novo upload
    if (!files.logo) {
      const result = await pool.query('SELECT logo_url FROM settings WHERE id = 1');
      if (result.rows.length > 0) {
        logoUrl = result.rows[0].logo_url || '';
      }
    }

    // Padronizar upload igual ao cadastro de membro
    if (files.logo) {
      const file = files.logo;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `settings/logo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      try {
        await s3.send(new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: fileName,
          Body: buffer,
          ContentType: file.type,
          ACL: 'public-read',
        }));
        logoUrl = `https://${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${fileName}`;
        console.log('Logo upload successful:', logoUrl);
      } catch (uploadError) {
        console.error('MinIO logo upload error:', uploadError);
        return NextResponse.json({ error: 'Failed to upload logo', details: uploadError instanceof Error ? uploadError.message : uploadError }, { status: 500 });
      }
    }

    // Upsert (atualiza se já existe, senão insere)
    await pool.query(
      `INSERT INTO settings (id, church_name, address, city, card_validity, logo_url)
       VALUES (1, $1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         church_name = EXCLUDED.church_name,
         address = EXCLUDED.address,
         city = EXCLUDED.city,
         card_validity = EXCLUDED.card_validity,
         logo_url = EXCLUDED.logo_url`,
      [churchName, address, city, cardValidity, logoUrl]
    );

    return NextResponse.json({ success: true, logoUrl });
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json({ error: 'Failed to save settings', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE id = 1');
    if (result.rows.length === 0) {
      return NextResponse.json({
        churchName: 'IMCN - Igreja Missionária Caminho Novo',
        address: 'Rua Dom Pedro, nº 33, bairro União',
        city: 'Flores da Cunha - RS',
        cardValidity: 12,
        logoUrl: '',
      });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 