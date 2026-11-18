import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { recordAuditLogServer } from '@/lib/audit';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    const rawQuotations = await db.collection('quotations').find({}).toArray();
    // Ensure every quotation has a valid id field and clean serialization
    const quotations = rawQuotations.map((q: any) => ({
      ...q,
      id: q.id || q.quotationNo || (q._id ? q._id.toString() : `quote-${Date.now()}`)
    }));
    // Sort by updatedAt descending
    quotations.sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
    return NextResponse.json(quotations);
  } catch (e) {
    console.error('Error fetching quotations:', e);
    return NextResponse.json({ error: 'Failed to fetch quotations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing quotation ID' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    
    // Remove immutable MongoDB _id if present to prevent update errors
    delete body._id;

    // Upsert quotation using ID
    const result = await db.collection('quotations').replaceOne(
      { id: body.id },
      body,
      { upsert: true }
    );

    // Auto-create Project in MongoDB when quotation is approved
    if (body.status === 'approved') {
      try {
        const quoteNo = body.quotationNo || body.id;
        const match = quoteNo.match(/\d+/);
        const suffix = match ? match[0] : String(Math.floor(Math.random() * 90000) + 10000);
        const projId = `proj-${body.id}`;

        const existingProject = await db.collection('projects').findOne({
          $or: [{ id: projId }, { quotationId: body.id }]
        });

        if (!existingProject) {
          const initialMilestones = [
            {
              id: `ms-${Date.now()}-1`,
              title: "1. المعاينة الفنية وتخطيط مسارات الكابلات والموقع",
              description: "فحص موقع العميل، مراجعة المخططات الهندسية وتحديد أماكن الكاميرات والأجهزة ونقاط التغذية.",
              status: "in_progress",
              targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
            },
            {
              id: `ms-${Date.now()}-2`,
              title: "2. توريد وتجهيز الأجهزة والمعدات والكاميرات",
              description: "توريد الكاميرات، مسجلات الفيديو NVR، السويتشات PoE، كبائن التوزيع، وحساسات البيت الذكي.",
              status: "pending",
              targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
            },
            {
              id: `ms-${Date.now()}-3`,
              title: "3. التمديدات والتأسيسات الأولية (First Fix)",
              description: "سحب كابلات الشبكة Cat6، تركيب المواسير والترانك PVC، وتجهيز لوحات التوزيع.",
              status: "pending",
              targetDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
            },
            {
              id: `ms-${Date.now()}-4`,
              title: "4. تركيب وتثبيت الكاميرات والأجهزة الذكية (Second Fix)",
              description: "تثبيت الكاميرات وضبط زوايا الرؤية، تركيب الشاشات، أقفال الأبواب الذكية وحساسات الحركة.",
              status: "pending",
              targetDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
            },
            {
              id: `ms-${Date.now()}-5`,
              title: "5. البرمجة والربط بالشبكة وتطبيق الهاتف والتشغيل",
              description: "برمجة أجهزة التسجيل، ضبط كشف الحركة والإنذارات، والربط بتطبيق الجوال لمتابعة البث الحي.",
              status: "pending",
              targetDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
            },
            {
              id: `ms-${Date.now()}-6`,
              title: "6. الفحص النهائي وتدريب العميل والتسليم (Handover)",
              description: "تسليم النظام، تدريب العميل على التشغيل، وتوقيع شهادة إتمام العمل والضمان.",
              status: "pending",
              targetDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
            }
          ];

          const initialLog = {
            id: `log-${Date.now()}`,
            date: new Date().toLocaleDateString("en-GB") + " " + new Date().toLocaleTimeString("ar-AE", { hour: "2-digit", minute: "2-digit" }),
            author: "النظام الذكي",
            activity: `تم اعتماد عرض السعر رقم (${quoteNo}) بقيمة (${Number(body.total || 0).toLocaleString()} AED) وإنشاء ملف المشروع تلقائياً وجدولة مراحله التنفيذية.`
          };

          const newProject = {
            id: projId,
            projectNo: `PRJ-${suffix}`,
            title: body.projectReference?.trim() || `مشروع ${body.clientName || 'العميل'} - أنظمة ذكية وكاميرات`,
            clientName: body.clientName || "عميل رواد سمارت",
            clientPhone: body.contactNo || body.clientPhone || "",
            location: body.locationArea || body.location || "الموقع الميداني",
            status: "in_progress",
            startDate: new Date().toISOString().split("T")[0],
            targetEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            budget: Number(body.total || 0),
            quotationId: body.id,
            contractId: `contract-${suffix}`,
            completionRate: 15,
            milestones: initialMilestones,
            siteLogs: [initialLog],
            sitePhotos: [],
            blueprints: [],
            notes: `تم إنشاء المشروع آلياً بمجرد اعتماد وتوقيع عرض السعر رقم ${quoteNo}.`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await db.collection('projects').insertOne(newProject as any);
        }
      } catch (projErr) {
        console.error("Auto project creation error in API:", projErr);
      }
    }

    await recordAuditLogServer(request, {
      actor: { 
        username: body.preparedBy || 'مسؤول النظام', 
        role: 'operations', 
        name: body.preparedBy || 'الموظف المسؤول' 
      },
      action: body.isInvoice ? 'INVOICE_SAVED' : 'QUOTATION_SAVED',
      actionTitleAr: body.isInvoice ? 'حفظ / إصدار فاتورة' : 'حفظ / تعديل عرض سعر',
      category: 'quotation',
      targetId: body.id,
      targetType: body.isInvoice ? 'فاتورة' : 'عرض سعر',
      details: `تم ${result.upsertedCount ? 'إنشاء' : 'تحديث'} ${body.isInvoice ? 'فاتورة' : 'عرض سعر'} رقم [${body.quotationNo || body.id}] للعميل (${body.clientName || 'غير محدد'}) بإجمالي [${Number(body.total || 0).toLocaleString()} AED].`,
      severity: 'info',
    });
    
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('Error saving quotation:', e);
    return NextResponse.json({ error: 'Failed to save quotation' }, { status: 500 });
  }
}
