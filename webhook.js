const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

function findEmail(obj, depth) {
  if (!obj || typeof obj !== 'object' || depth > 4) return null;
  const directKeys = ['email', 'customer_email', 'buyer_email', 'contact_email', 'user_email'];
  for (const k of directKeys) {
    if (typeof obj[k] === 'string' && obj[k].includes('@')) return obj[k];
  }
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string' && key.toLowerCase().includes('email') && val.includes('@')) {
      return val;
    }
    if (val && typeof val === 'object') {
      const found = findEmail(val, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (process.env.WEBHOOK_SECRET) {
    const provided = req.query.secret || req.headers['x-webhook-secret'];
    if (provided !== process.env.WEBHOOK_SECRET) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  const body = req.body || {};
  console.log('Webhook payload received:', JSON.stringify(body));

  const email = findEmail(body, 0);
  if (!email) {
    console.log('No email found in payload');
    res.status(200).json({ ok: false, reason: 'no-email-found' });
    return;
  }

  const normalized = email.trim().toLowerCase();
  await db.collection('paidEmails').doc(normalized).set({
    email: normalized,
    paid: true,
    source: 'convertbuilder',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Marked as paid:', normalized);
  res.status(200).json({ ok: true, email: normalized });
};
