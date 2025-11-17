import { NextRequest, NextResponse } from 'next/server';
import { 
  TransactionsWorkspacePayload, 
  getTransactionsFixture 
} from '@/lib/api/transactions';

// In-memory storage for demonstration - replace with database in production
let storedTransactionsWorkspace: TransactionsWorkspacePayload = getTransactionsFixture();

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(storedTransactionsWorkspace);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const workspace = body as TransactionsWorkspacePayload;

    if (!workspace.transactions || !Array.isArray(workspace.transactions)) {
      return NextResponse.json({ error: 'Invalid transactions workspace format' }, { status: 400 });
    }

    if (!workspace.importJobs || !Array.isArray(workspace.importJobs)) {
      return NextResponse.json({ error: 'Invalid import jobs format' }, { status: 400 });
    }

    storedTransactionsWorkspace = workspace;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving transactions:', error);
    return NextResponse.json({ error: 'Failed to save transactions' }, { status: 500 });
  }
}
