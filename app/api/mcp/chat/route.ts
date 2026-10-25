import { NextRequest, NextResponse } from 'next/server';
import { MCPClient } from '@/lib/mcp/ai-client';
import { modelMessageSchema } from 'ai';
import { z } from 'zod';

const chatInput = z.object({
  message: z.string().min(1),
  externalUserId: z.string().min(1),
  conversationHistory: z.array(modelMessageSchema).default([]),
});

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const input = chatInput.safeParse(await request.json().catch(() => null));

    if (!input.success) {
      return NextResponse.json(
        { error: 'A message, external user ID, and valid conversation history are required' },
        { status: 400 }
      );
    }

    const { message, externalUserId, conversationHistory } = input.data;

    // Initialize MCP client
    const mcpClient = new MCPClient({
      externalUserId,
    });

    try {
      await mcpClient.initialize();
      
      // Process the message
      const response = await mcpClient.processMessage(message, conversationHistory);
      
      return NextResponse.json({
        response: response.text,
        finishReason: response.finishReason,
        toolCalls: response.toolCalls || [],
        toolResults: response.toolResults || [],
      });
    } finally {
      await mcpClient.close();
    }
  } catch (error) {
    console.error('MCP chat error:', error);
    
    // Check for MCP configuration errors
    if (error instanceof Error && (error.message.includes('MCP not configured') || error.message.includes('Environment validation failed'))) {
      return NextResponse.json(
        { error: 'MCP service not configured. Please add MCP environment variables to .env.local to enable AI chat features.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}