import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY
);

const sendGridApiKey = process.env.SENDGRID_API_KEY;
const sendGridSender = process.env.SENDGRID_SENDER;
const hasSendGridConfig = Boolean(sendGridApiKey && sendGridSender);
if (sendGridApiKey) {
  sgMail.setApiKey(sendGridApiKey);
}

const bizflowApiKey = process.env.BIZFLOW_API_KEY;
const allowInsecure = process.env.BIZFLOW_ALLOW_INSECURE === 'true';
const enforceApiKey = Boolean(bizflowApiKey) && !allowInsecure;

const requireApiKey = (req, res, next) => {
  if (!enforceApiKey) {
    return next();
  }

  const provided = req.headers['x-api-key'];
  if (provided === bizflowApiKey) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized - missing API key' });
};

const hasSupabaseConfig = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_API_KEY);

const businessTypes = [
  { id: 'cleaning', label: 'Cleaning Services', goal: 62 },
  { id: 'photobooth', label: 'Photobooth Business', goal: 48 },
  { id: 'courses', label: 'Gold Wealth Academy', goal: 32 },
];

const verticalStats = businessTypes.reduce((acc, type) => {
  acc[type.id] = { interactions: 0, deliveries: 0 };
  return acc;
}, {});

const normalizeBusinessType = (value) => {
  if (!value) return 'cleaning';
  const candidate = value.toString().toLowerCase();
  const found = businessTypes.find((type) => candidate.includes(type.id));
  return found ? found.id : 'cleaning';
};

const initVerticalStats = async () => {
  if (!hasSupabaseConfig) return;
  try {
    const { data } = await supabase
      .from('agent_interactions')
      .select('business_type')
      .limit(500);

    if (!data) return;

    data.forEach((row) => {
      const normalized = normalizeBusinessType(row.business_type);
      verticalStats[normalized] = verticalStats[normalized] || { interactions: 0, deliveries: 0 };
      verticalStats[normalized].interactions += 1;
    });
  } catch (err) {
    console.error('Failed to initialize vertical stats:', err.message);
  }
};

initVerticalStats();

const onboardingSteps = [
  {
    id: 'claim-workspace',
    title: 'Claim your Bizflow workspace',
    description:
      'Create an Experience Agent account, verify your email, and link your Supabase project so you can see interactions in one dashboard.',
    actions: ['/api/agent', '/api/onboarding/steps'],
    icon: '🗝️',
  },
  {
    id: 'configure-agent',
    title: 'Configure your concierge agent',
    description:
      'Define tone, personas, and default replies so the agent feels like part of your brand. Every change is stored in Supabase for analytics.',
    actions: ['/api/interactions', '/api/dashboard/summary'],
    icon: '🤖',
  },
  {
    id: 'invite-team',
    title: 'Invite your team & stakeholders',
    description:
      'Share progress links, onboarding data, and dashboards with your customer success or ops leads so everyone knows how experiences perform.',
    actions: ['/api/onboarding/progress', '/api/dashboard/summary'],
    icon: '🌐',
  },
  {
    id: 'measure-and-iterate',
    title: 'Measure, learn, repeat',
    description:
      'Pull consolidated metrics from the dashboard, celebrate wins, and push new prompts when the experience needs a boost.',
    actions: ['/api/dashboard/summary'],
    icon: '📊',
  },
];

const progressBuffer = [];

const logInteraction = async ({ user_id, message, response, business_type }) => {
  const normalized = normalizeBusinessType(business_type);
  const payload = {
    user_id,
    user_message: message,
    agent_response: response || null,
    business_type: normalized,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('agent_interactions').insert([payload]);

  verticalStats[normalized] = verticalStats[normalized] || { interactions: 0, deliveries: 0 };
  verticalStats[normalized].interactions += 1;
  if ((message || '').toLowerCase().includes('course delivery')) {
    verticalStats[normalized].deliveries += 1;
  }

  return { data, error, normalized };
};

const sendCourseEmail = async ({ to, courseTitle, note }) => {
  if (!hasSendGridConfig) {
    return false;
  }

  const textParts = [
    `Course delivered: ${courseTitle}`,
    `Access link sent to ${to}`,
    note || 'No extra notes provided.',
  ];

  try {
    await sgMail.send({
      to,
      from: sendGridSender,
      subject: `Gold Wealth Academy access: ${courseTitle}`,
      text: textParts.join('\n'),
    });
    return true;
  } catch (err) {
    console.error('SendGrid error:', err.message || err);
    return false;
  }
};

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
app.post('/api/interactions', requireApiKey, async (req, res) => {
  const { user_id, message, response, business_type } = req.body;

  if (!user_id || !message) {
    return res.status(400).json({ error: 'user_id and message required' });
  }

  try {
    const { data, error, normalized } = await logInteraction({
      user_id,
      message,
      response,
      business_type,
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      message: 'Interaction saved',
      data,
      business_type: normalized,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/onboarding/steps', requireApiKey, (req, res) => {
  res.json({
    status: hasSupabaseConfig ? 'connected' : 'unconfigured',
    steps: onboardingSteps,
    summary:
      hasSupabaseConfig
        ? 'Supabase is wired—output the steps directly to your UI.'
        : 'Supabase credentials missing. Steps are safe to display offline.',
  });
});

app.post('/api/onboarding/progress', requireApiKey, async (req, res) => {
  const { user_id, step_id, completed = false, metadata = {}, business_type } = req.body;

  if (!user_id || !step_id) {
    return res.status(400).json({ error: 'user_id and step_id are required' });
  }

  const normalizedBusinessType = normalizeBusinessType(business_type);

  const progressRecord = {
    user_id,
    step_id,
    completed,
    metadata,
    business_type: normalizedBusinessType,
    created_at: new Date().toISOString(),
  };

  progressBuffer.push(progressRecord);

  if (!hasSupabaseConfig) {
    return res.status(202).json({
      success: true,
      stored: false,
      message: 'Supabase credentials missing; onboarding progress cached in memory for development.',
      record: progressRecord,
    });
  }

  try {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .insert([progressRecord]);

    if (error) {
      console.error('Failed to save onboarding progress:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      stored: true,
      message: 'Progress saved',
      record: data,
    });
  } catch (err) {
    console.error('Unexpected error while saving onboarding progress:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/course-delivery', requireApiKey, async (req, res) => {
  const { email, courseTitle, note } = req.body;

  if (!email || !courseTitle) {
    return res.status(400).json({ error: 'email and courseTitle are required' });
  }

  const emailSent = await sendCourseEmail({
    to: email,
    courseTitle,
    note,
  });

  try {
    const { data, error } = await logInteraction({
      user_id: email,
      message: `Course delivery: ${courseTitle}`,
      response: note || 'Access link delivered via SendGrid',
      business_type: 'courses',
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      message: emailSent ? 'Course delivery logged and email sent' : 'Logged course delivery (email not configured)',
      emailSent,
      data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/summary', requireApiKey, async (req, res) => {
  const baseResponse = {
    totalInteractions: 0,
    uniqueUsers: 0,
    recentInteractions: [],
    status: hasSupabaseConfig ? 'connected' : 'unconfigured',
    note: hasSupabaseConfig
      ? 'Live metrics from agent_interactions table'
      : 'Supabase credentials missing',
  };

  if (!hasSupabaseConfig) {
    return res.json(baseResponse);
  }

  try {
    const { data: recentInteractions, error: recentError } = await supabase
      .from('agent_interactions')
      .select('id, user_id, user_message, agent_response, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      throw recentError;
    }

    const { count, error: countError } = await supabase
      .from('agent_interactions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    const uniqueUsers = new Set((recentInteractions || []).map((entry) => entry.user_id)).size;
    const verticalBreakdown = businessTypes.map((type) => ({
      id: type.id,
      label: type.label,
      interactions: verticalStats[type.id]?.interactions ?? 0,
      deliveries: verticalStats[type.id]?.deliveries ?? 0,
    }));

    res.json({
      totalInteractions: typeof count === 'number' ? count : recentInteractions.length,
      uniqueUsers,
      recentInteractions,
      status: 'connected',
      note: 'Live metrics from agent_interactions table.',
      verticalBreakdown,
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({
      error: err.message,
      ...baseResponse,
      status: 'error',
    });
  }
});

app.get('/api/dashboard/verticals', requireApiKey, (req, res) => {
  res.json({
    types: businessTypes.map((type) => ({
      id: type.id,
      label: type.label,
      goal: type.goal,
      interactions: verticalStats[type.id]?.interactions ?? 0,
      deliveries: verticalStats[type.id]?.deliveries ?? 0,
    })),
  });
});

app.post('/api/playbook-run', requireApiKey, async (req, res) => {
  const { playbookId, business_type } = req.body;

  if (!playbookId) {
    return res.status(400).json({ error: 'playbookId required' });
  }

  try {
    const { data, error } = await supabase
      .from('playbook_runs')
      .insert([{
        playbook_id: playbookId,
        business_type: business_type || 'cleaning',
        created_at: new Date().toISOString(),
      }]);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/playbook-stats', requireApiKey, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('playbook_runs')
      .select('playbook_id, count:playbook_id')
      .group('playbook_id')
      .order('count', { ascending: false })
      .limit(5);

    if (error) {
      throw error;
    }

    res.json({ stats: data || [] });
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
