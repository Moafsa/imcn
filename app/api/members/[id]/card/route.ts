import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    console.log('Buscando dados do membro:', id);
    const result = await pool.query(
      'SELECT * FROM members WHERE id = $1',
      [id]
    );
    console.log('Resultado do membro:', result.rows);
    if (result.rows.length === 0) {
      console.log('Membro não encontrado');
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    const member = result.rows[0];
    
    if (member.status !== 'Ativo') {
      return NextResponse.json({ error: 'Carteirinha só pode ser gerada para membros ativos.' }, { status: 403 });
    }
    
    // Buscar configurações da igreja
    console.log('Buscando settings...');
    const settingsResult = await pool.query('SELECT * FROM settings WHERE id = 1');
    console.log('Resultado settings:', settingsResult.rows);
    const settings = settingsResult.rows[0] || {};
    const churchName = settings.church_name || 'IMCN - Igreja Missionária Caminho Novo';
    const churchAddress = settings.address || '';
    const churchCity = settings.city || '';
    const cardValidity = settings.card_validity || 12;
    const logoUrl = settings.logo_url || '';

    // Criar PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 250]);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Fundo
    page.drawRectangle({ x: 0, y: 0, width: 400, height: 250, color: rgb(0.97, 0.97, 0.97) });
    // Header
    page.drawRectangle({ x: 0, y: 200, width: 400, height: 50, color: rgb(0.2, 0.3, 0.7) });

    // Logo
    if (logoUrl) {
      try {
        console.log('Baixando logo:', logoUrl);
        const logoRes = await fetch(logoUrl);
        const logoBuffer = await logoRes.arrayBuffer();
        let logoImg;
        if (logoUrl.endsWith('.png')) {
          logoImg = await pdfDoc.embedPng(logoBuffer);
        } else {
          logoImg = await pdfDoc.embedJpg(logoBuffer);
        }
        page.drawImage(logoImg, { x: 20, y: 205, width: 40, height: 40 });
        console.log('Logo embutida com sucesso');
      } catch (e) {
        console.error('Erro ao baixar/embutir logo:', e);
      }
    }
    // Nome da igreja
    page.drawText(churchName, { x: 70, y: 225, size: 14, font: helveticaBold, color: rgb(1,1,1) });
    page.drawText(churchAddress, { x: 70, y: 212, size: 8, font: helvetica, color: rgb(1,1,1) });
    page.drawText(churchCity, { x: 70, y: 202, size: 8, font: helvetica, color: rgb(1,1,1) });

    // Foto do membro
    let photoDrawn = false;
    if (member.photo_url) {
      try {
        console.log('Baixando foto do membro:', member.photo_url);
        const photoRes = await fetch(member.photo_url);
        const photoBuffer = await photoRes.arrayBuffer();
        let photoImg;
        if (member.photo_url.endsWith('.png')) {
          photoImg = await pdfDoc.embedPng(photoBuffer);
        } else {
          photoImg = await pdfDoc.embedJpg(photoBuffer);
        }
        page.drawImage(photoImg, { x: 20, y: 80, width: 100, height: 100 });
        photoDrawn = true;
        console.log('Foto do membro embutida com sucesso');
      } catch (e) {
        console.error('Erro ao baixar/embutir foto do membro:', e);
      }
    }
    if (!photoDrawn) {
      page.drawRectangle({ x: 20, y: 80, width: 100, height: 100, borderColor: rgb(0.2,0.2,0.2), borderWidth: 1 });
      page.drawText('FOTO', { x: 55, y: 130, size: 12, font: helvetica, color: rgb(0.5,0.5,0.5) });
    }

    // Dados do membro
    let y = 170;
    const left = 140;
    const capitalize = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
    const line = (label: string, value: string, size = 10) => {
      page.drawText(label, { x: left, y, size, font: helvetica, color: rgb(0.3,0.3,0.3) });
      page.drawText(value, { x: left+60, y, size, font: helveticaBold, color: rgb(0,0,0) });
      y -= 15;
    };
    line('Nome:', member.name);
    line('Cargo:', capitalize(member.role));
    line('Documento:', member.document || '-');
    line('Estado civil:', member.marital_status || '-');
    line('Endereço:', member.address || '-');
    line('Telefone:', member.phone || '-');
    line('Email:', member.email || '-');
    line('Cidade:', member.city || '-');
    line('Congreg.:', member.congregation || '-');
    if (member.baptism_date) {
      line('Batismo:', new Date(member.baptism_date).toLocaleDateString('pt-BR'));
    }
    line('Cadastro:', new Date(member.created_at).toLocaleDateString('pt-BR'));
    line('Validade:', new Date(member.expires_at).toLocaleDateString('pt-BR'));

    // ID
    page.drawText(`ID: ${member.id}`, { x: 20, y: 20, size: 8, font: helvetica, color: rgb(0.5,0.5,0.5) });

    // Gerar PDF
    console.log('Salvando PDF...');
    const pdfBytes = await pdfDoc.save();
    console.log('PDF gerado com sucesso!');
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="card-${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating card:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 