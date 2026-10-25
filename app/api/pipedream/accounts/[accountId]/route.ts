import { NextRequest, NextResponse } from 'next/server';
// import { PipedreamClient } from '@pipedream/sdk';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Only initialize client if environment variables are provided
// let client: PipedreamClient | null = null;

// try {
//   if (process.env.PIPEDREAM_PROJECT_ID && process.env.PIPEDREAM_CLIENT_ID && process.env.PIPEDREAM_CLIENT_SECRET) {
//     client = new PipedreamClient({
//       projectId: process.env.PIPEDREAM_PROJECT_ID,
//       projectEnvironment: (process.env.PIPEDREAM_PROJECT_ENVIRONMENT as 'development' | 'production') || 'development',
//       clientId: process.env.PIPEDREAM_CLIENT_ID,
//       clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
//     });
//   }
// } catch (error) {
//   console.warn('Pipedream client initialization failed:', error);
// }

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  // Pipedream integration temporarily disabled
  return NextResponse.json(
    { error: 'Pipedream integration temporarily disabled' },
    { status: 503 }
  );
  
  // try {
  //   if (!client) {
  //     return NextResponse.json(
  //       { error: 'Pipedream client not configured. Please check environment variables.' },
  //       { status: 500 }
  //     );
  //   }

  //   const { accountId } = params;

  //   const account = await client.accounts.list({
  //     externalUserId: accountId,
  //   });

  //   return NextResponse.json(account);
  // } catch (error) {
  //   console.error('Error fetching account:', error);
  //   return NextResponse.json(
  //     { error: 'Failed to fetch account' },
  //     { status: 500 }
  //   );
  // }
}