import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    const employee = await db.collection('employees').findOne({ id });

    if (!employee) {
      return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (e) {
    console.error(`Error fetching employee:`, e);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');

    // 1. Delete the employee record
    const result = await db.collection('employees').deleteOne({ id });

    // 2. Cascade delete all payroll records for this employee immediately
    const payrollResult = await db.collection('payroll').deleteMany({ employeeId: id });

    // 3. Cascade delete all attendance / daily timesheet records for this employee immediately
    const attendanceResult = await db.collection('attendance').deleteMany({ employeeId: id });

    // 4. Remove this employee from all field projects assignedEmployees array
    await db.collection('projects').updateMany(
      { assignedEmployees: id },
      { $pull: { assignedEmployees: id } as any }
    );

    // 5. Delete staff permission / credentials associated with this employee if any
    await db.collection('staff_users').deleteMany({ employeeId: id });

    return NextResponse.json({ 
      success: true, 
      result,
      deletedPayrollCount: payrollResult.deletedCount,
      deletedAttendanceCount: attendanceResult.deletedCount,
      message: 'تم حذف الموظف ومسير رواتبه وسجلات حضوره بالكامل فوراً'
    });
  } catch (e) {
    console.error(`Error deleting employee:`, e);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
