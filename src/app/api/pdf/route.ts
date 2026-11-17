import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { filename } = await request.json();

    return NextResponse.json({ 
      success: true, 
      message: 'Print mode is the recommended high-fidelity vector PDF export method.',
      filename: filename || 'document'
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Server error', details: errorMessage }, { status: 500 });
  }
}
