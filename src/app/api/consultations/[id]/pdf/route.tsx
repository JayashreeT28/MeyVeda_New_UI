import { NextRequest } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { ConsultationPdfDocument } from '@/components/consultation-report/ConsultationPdfDocument';
import { getConsultationReportData } from '@/lib/queries';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Fetch consultation data
    const data = await getConsultationReportData(id);
    
    if (!data) {
      return new Response('Consultation not found', { status: 404 });
    }

    // 2. Render PDF to Node stream
    const pdfStream = await renderToStream(<ConsultationPdfDocument data={data} />);

    // 3. Convert Node stream to Web ReadableStream for Next.js App Router Response
    const webStream = new ReadableStream({
      start(controller) {
        pdfStream.on('data', (chunk) => controller.enqueue(chunk));
        pdfStream.on('end', () => controller.close());
        pdfStream.on('error', (err) => controller.error(err));
      }
    });

    // 4. Construct safe filename
    const patientName = (data.patients as any)?.full_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Patient';
    const dateStr = data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : 'Date';
    const filename = `MeyVeda_Consultation_${patientName}_${dateStr}.pdf`;

    // 5. Return PDF
    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response('Failed to generate PDF', { status: 500 });
  }
}
