// Netlify serverless function for AI Concierge
// Converts the Vercel function format to Netlify format

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

// Environment validation
const requiredEnv = ['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnv = requiredEnv.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  console.error('[Concierge] Missing required environment variables:', missingEnv);
}

// Initialize clients
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const systemPrompt = `You are the AI concierge for Pride Vacations, a luxury bespoke travel company specializing in curated experiences for the LGBTQ+ community. You help travelers:
- Discover signature experiences (mountain retreats, beach getaways, cultural journeys, wellness escapes)
- Learn about destinations and travel stories
- Understand the booking process
- Answer questions about Pride Vacations' services

Be warm, professional, and knowledgeable. Keep responses concise (2-3 sentences). Always emphasize the bespoke, personalized nature of Pride Vacations.`;

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check environment
  if (!openai || !supabase) {
    console.error('[Concierge] Service misconfigured');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server misconfigured' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  const { message, conversationId } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Message is required' })
    };
  }

  const finalConvId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  try {
    // Fetch conversation history
    let history = [];
    if (conversationId) {
      const { data, error } = await supabase
        .from('conversations')
        .select('messages')
        .eq('conversation_id', conversationId)
        .single();
      
      if (!error && data?.messages) {
        history = data.messages;
      }
    }

    // Build messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message.trim() }
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 300
    });

    const reply = completion.choices[0]?.message?.content || 'I apologize, I couldn't process that request.';

    // Update conversation history
    const updatedHistory = [
      ...history,
      { role: 'user', content: message.trim() },
      { role: 'assistant', content: reply }
    ].slice(-20); // Keep last 10 exchanges

    await supabase
      .from('conversations')
      .upsert({
        conversation_id: finalConvId,
        messages: updatedHistory,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'conversation_id'
      });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply,
        conversationId: finalConvId
      })
    };

  } catch (err) {
    console.error('[Concierge] Error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process request',
        conversationId: finalConvId
      })
    };
  }
};
