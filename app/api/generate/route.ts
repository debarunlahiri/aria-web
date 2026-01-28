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
            
            // Try to extract text from various possible chunk structures
            if (chunk.text) {
              text = chunk.text;
            } else if (typeof chunk === 'string') {
              text = chunk;
            } else if ((chunk as any).candidates?.[0]?.content?.parts?.[0]?.text) {
              text = (chunk as any).candidates[0].content.parts[0].text;
            } else if ((chunk as any).content?.parts?.[0]?.text) {
              text = (chunk as any).content.parts[0].text;
            } else if ((chunk as any).parts?.[0]?.text) {
              text = (chunk as any).parts[0].text;
            } else {
              // Skip this chunk if we can't extract text
              console.warn('Unable to extract text from chunk:', JSON.stringify(chunk));
              continue;
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
          
          let errorMessage = error.message || 'Failed to get response from Gemini';
          let retryAfter = null;
          let statusCode = 500;
          
          // Parse nested JSON error messages (error.message might contain JSON string)
          let parsedError: any = null;
          try {
            if (typeof error.message === 'string' && error.message.trim().startsWith('{')) {
              parsedError = JSON.parse(error.message);
            }
          } catch (e) {
            // Not JSON, continue with original error
          }
          
          // Check for 429 errors in various places
          const is429 = error.status === 429 || 
                       error.code === 429 || 
                       error.statusCode === 429 ||
                       parsedError?.error?.code === 429 ||
                       parsedError?.code === 429;
          
          if (is429) {
            statusCode = 429;
            errorMessage = 'Rate limit exceeded. You have exceeded your API quota.';
            
            // Try to extract retry delay from error response
            try {
              const errorResponse = parsedError || error.response || error.error || error;
              
              // Check if errorResponse is a string that needs parsing
              let errorObj = errorResponse;
              if (typeof errorResponse === 'string') {
                try {
                  errorObj = JSON.parse(errorResponse);
                } catch (e) {
                  errorObj = errorResponse;
                }
              }
              
              // Try to find retry info in nested structure
              const errorDetails = errorObj?.error?.details || errorObj?.details || [];
              const retryInfo = errorDetails.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
              
              if (retryInfo?.retryDelay) {
                const delayMatch = retryInfo.retryDelay.match(/(\d+(?:\.\d+)?)s?/);
                if (delayMatch) {
                  retryAfter = Math.ceil(parseFloat(delayMatch[1]));
                }
              }
              
              // If no retry delay found, check the error message
              if (!retryAfter) {
                const errorMsg = errorObj?.error?.message || errorObj?.message || error.message || '';
                const messageMatch = errorMsg.match(/retry in (\d+(?:\.\d+)?)s/i);
                if (messageMatch) {
                  retryAfter = Math.ceil(parseFloat(messageMatch[1]));
                }
              }
            } catch (parseError) {
              console.error('Error parsing retry delay:', parseError);
            }
            
            if (retryAfter) {
              errorMessage = `Rate limit exceeded. Please retry in ${retryAfter} seconds.`;
            } else {
              errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
            }
          }
          
          const errorData = JSON.stringify({ 
            error: errorMessage,
            code: statusCode,
            retryAfter,
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
    
    let errorMessage = error.message || 'Failed to get response from Gemini';
    let retryAfter = null;
    let statusCode = 500;
    
    // Parse nested JSON error messages (error.message might contain JSON string)
    let parsedError: any = null;
    try {
      if (typeof error.message === 'string' && error.message.trim().startsWith('{')) {
        parsedError = JSON.parse(error.message);
      }
    } catch (e) {
      // Not JSON, continue with original error
    }
    
    // Check for 429 errors in various places
    const is429 = error.status === 429 || 
                 error.code === 429 || 
                 error.statusCode === 429 ||
                 parsedError?.error?.code === 429 ||
                 parsedError?.code === 429;
    
    if (is429) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded. You have exceeded your API quota.';
      
      // Try to extract retry delay from error response
      try {
        const errorResponse = parsedError || error.response || error.error || error;
        
        // Check if errorResponse is a string that needs parsing
        let errorObj = errorResponse;
        if (typeof errorResponse === 'string') {
          try {
            errorObj = JSON.parse(errorResponse);
          } catch (e) {
            errorObj = errorResponse;
          }
        }
        
        // Try to find retry info in nested structure
        const errorDetails = errorObj?.error?.details || errorObj?.details || [];
        const retryInfo = errorDetails.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
        
        if (retryInfo?.retryDelay) {
          const delayMatch = retryInfo.retryDelay.match(/(\d+(?:\.\d+)?)s?/);
          if (delayMatch) {
            retryAfter = Math.ceil(parseFloat(delayMatch[1]));
          }
        }
        
        // If no retry delay found, check the error message
        if (!retryAfter) {
          const errorMsg = errorObj?.error?.message || errorObj?.message || error.message || '';
          const messageMatch = errorMsg.match(/retry in (\d+(?:\.\d+)?)s/i);
          if (messageMatch) {
            retryAfter = Math.ceil(parseFloat(messageMatch[1]));
          }
        }
      } catch (parseError) {
        console.error('Error parsing retry delay:', parseError);
      }
      
      if (retryAfter) {
        errorMessage = `Rate limit exceeded. Please retry in ${retryAfter} seconds.`;
      } else {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: statusCode,
        retryAfter,
        success: false 
      }),
      { status: statusCode, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

