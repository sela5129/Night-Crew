module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { record, table } = req.body;

    let subject = '🔔 New Pending Item - Night Crew';
    let details = '';

    if (table === 'question_answers') {
      subject = '❓ New Question Answer - Night Crew';
      details = `<p><strong>Member:</strong> ${record?.member || 'Unknown'}</p>
                 <p><strong>Answer:</strong> ${record?.answer || 'N/A'}</p>
                 <p><strong>Points:</strong> ${record?.points || 'N/A'}</p>`;
    } else if (table === 'submissions') {
      subject = '📸 New Photo Submission - Night Crew';
      details = `<p><strong>Member:</strong> ${record?.member || 'Unknown'}</p>
                 <p><strong>Description:</strong> ${record?.description || 'N/A'}</p>
                 <p><strong>Points:</strong> ${record?.points || 'N/A'}</p>`;
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: 'sergiolara22@gmail.com',
        subject,
        html: `<h2>🌙 Night Crew - Approval Needed</h2>${details}
               <a href="https://night-crew.vercel.app">Go to Admin Panel</a>`,
      }),
    });

    const result = await emailRes.json();
    console.log('Resend result:', JSON.stringify(result));
    return res.status(200).json({ success: true, result });

  } catch (err) {
    console.error('Handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
