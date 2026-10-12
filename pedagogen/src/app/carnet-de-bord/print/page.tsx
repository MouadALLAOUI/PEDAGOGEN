import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/db/auth';
import { getPrintNotebookData, type PrintParams } from '@/lib/notebook/notebookPrintService';
import { PrintToolbar } from '@/components/notebook/print/PrintToolbar';
import { PrintDocumentView } from '@/components/notebook/print/PrintDocumentView';

interface PrintPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = 'force-dynamic';

export default async function CarnetDeBordPrintPage({ searchParams }: PrintPageProps) {
  // 1. Auth check
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) {
    redirect('/login');
  }

  const payload = await verifyToken(token);
  if (!payload?.sub) {
    redirect('/login');
  }
  const userId = payload.sub;

  // 2. Parse search parameters
  const sp = await searchParams;

  const rawClasses = typeof sp.classes === 'string' ? sp.classes : undefined;
  const classesList =
    rawClasses && rawClasses !== 'all' && rawClasses !== 'none'
      ? rawClasses.split(',').map((s) => s.trim()).filter(Boolean)
      : rawClasses === 'none'
      ? ['__none__']
      : undefined;

  const from = typeof sp.from === 'string' ? sp.from : undefined;
  const to = typeof sp.to === 'string' ? sp.to : undefined;

  const rawStatus = typeof sp.status === 'string' ? sp.status : undefined;
  const statusList = rawStatus ? rawStatus.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

  const rawTypes = typeof sp.types === 'string' ? sp.types : undefined;
  const typesList = rawTypes ? rawTypes.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

  const layout = sp.layout === 'chrono' ? 'chrono' : 'class';
  const detail = sp.detail === 'detailed' ? 'detailed' : 'compact';

  const rawRecap = Array.isArray(sp.recap) ? sp.recap[0] : sp.recap;
  const recap = rawRecap !== undefined ? (rawRecap === '1' || rawRecap === 'true') : true;

  const rawSignatures = Array.isArray(sp.signatures) ? sp.signatures[0] : sp.signatures;
  const signatures = rawSignatures !== undefined ? (rawSignatures === '1' || rawSignatures === 'true') : true;

  const rawHeader = Array.isArray(sp.header) ? sp.header[0] : sp.header;
  const header = rawHeader !== undefined ? (rawHeader === '1' || rawHeader === 'true') : true;

  const teacherName = typeof sp.teacherName === 'string' ? sp.teacherName : undefined;
  const school = typeof sp.school === 'string' ? sp.school : undefined;
  const subject = typeof sp.subject === 'string' ? sp.subject : undefined;
  const academicYear = typeof sp.academicYear === 'string' ? sp.academicYear : undefined;

  const printParams: PrintParams = {
    classes: classesList,
    from,
    to,
    status: statusList,
    types: typesList,
    layout,
    detail,
    recap,
    signatures,
    header,
    teacherName,
    school,
    subject,
    academicYear,
  };

  // 3. Fetch server data
  const data = await getPrintNotebookData(userId, printParams);

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-navy font-sans antialiased selection:bg-teal selection:text-white">
      {/* Sticky Top Toolbar for screen preview only */}
      <PrintToolbar
        totalSessions={data.entries.length}
        totalClasses={data.classes.length}
        layout={layout}
        detail={detail}
      />

      {/* Main A4 Document Paper Container */}
      <main className="py-8 print:py-0 px-2 sm:px-4 print:px-0">
        <PrintDocumentView data={data} params={printParams} />
      </main>
    </div>
  );
}
