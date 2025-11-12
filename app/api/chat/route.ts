import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';

const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export async function POST(request: NextRequest) {
  try {
    const { message, history, model } = await request.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use the selected model or default to gemini-2.0-flash-exp
    const selectedModel = model || 'gemini-2.0-flash-exp';

    // Check if it's a ChatGPT model (not supported yet)
    if (selectedModel.startsWith('gpt-')) {
      return new Response(
        JSON.stringify({ error: 'ChatGPT models are not supported yet. Please use a Gemini model.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let contents: any;
    
    if (history && history.length > 0) {
      contents = [
        ...history,
        {
          role: 'user',
          parts: [{ text: message }]
        }
      ];
    } else {
      contents = message;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await ai.models.generateContentStream({
            model: selectedModel,
            contents: contents,
            config: {
              maxOutputTokens: 8192,
              temperature: 1.0,
              topP: 0.95,
              topK: 40,
            },
          });

          for await (const chunk of response) {
            let text = '';
            
            if (chunk.text) {
              text = chunk.text;
            } else if (typeof chunk === 'string') {
              text = chunk;
            } else {
              try {
                text = String(chunk);
              } catch (e) {
                console.error('Error extracting text from chunk:', e, chunk);
              }
            }
            
            if (text) {
              const data = JSON.stringify({ text, done: false });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          const doneData = JSON.stringify({ text: '', done: true });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          controller.close();
        } catch (error: any) {
          console.error('Error in stream:', error);
          const errorData = JSON.stringify({ 
            error: error.message || 'Failed to get response from Gemini',
            done: true 
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to get response from Gemini',
        success: false 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

