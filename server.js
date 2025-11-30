import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY
);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Experience Agent is running' });
});

// Get Agent Info
app.get('/api/agent', (req, res) => {
  res.json({
    name: 'Experience Agent',
    version: '1.0.0',
    status: 'active',
    database: 'Supabase connected'
  });
});

// Test Supabase Connection
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('test_table')
      .select('*')
      .limit(1);

    if (error) {
      return res.status(500).json({ 
        connected: false, 
        error: error.message 
      });
    }

    res.json({ 
      connected: true, 
      message: 'Supabase connection successful' 
    });
  } catch (err) {
    res.status(500).json({ 
      connected: false, 
      error: err.message 
    });
  }
});

// Save Agent Interaction
app.post('/api/interactions', async (req, res) => {
  const { user_id, message, response } = req.body;

  if (!user_id || !message) {
    return res.status(400).json({ error: 'user_id and message required' });
  }

  try {
    const { data, error } = await supabase
      .from('agent_interactions')
      .insert([
        {
          user_id,
          user_message: message,
          agent_response: response || null,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Interaction saved', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get User Interactions
app.get('/api/interactions/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
    const { data, error } = await supabase
      .from('agent_interactions')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, count: data.length, interactions: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`
🚀 Experience Agent Server Started
✅ Port: ${PORT}
✅ Environment: ${process.env.NODE_ENV || 'development'}
✅ Supabase: Connected
  `);
});
