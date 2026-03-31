export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { record, table } = req.body;

  // Build the email content based on which table triggered it
  let subject, details;

  if (table === 'question_answers') {
    subject = '❓ New Question Answer - Night Crew';
    details = `
      <tr><td><strong>Type</strong></td><td>Question Answer</td></tr>
      <tr><td><strong>Member</strong></td><td>${record?.member || 'Unknown'}</td></tr>
      <tr><td><strong>Answer</strong></td><td>${record?.answer || 'N/A'}</td></tr>
      <tr><td><strong>Points at stake</strong></td><td>${record?.points || 'N/A'} pts</td></tr>
      <tr><td><strong>Status</strong></td><td>${record?.status || 'pending'}</td></tr>
    `;
  } else if (table === 'submissions') {
    subject = '📸 New Photo Submission - Night Crew';
    details = `
      <tr><td><strong>Type</strong></td><td>Photo Submission</td></tr>
      <tr><td><strong>Member</strong></td><td>${record?.member || record?.user_id || 'Unknown'}</td></tr>
      <tr><td><strong>Description</strong></td><td>${record?.description || 'N/A'}</td></tr>
      <tr><td><strong>Points at stake</strong></td><td>${record?.points || 'N/A'} pts</td></tr>
    `;
  } else {
    subject = '🔔 New Pending Item - Night Crew';
    details = `
      <tr><td><strong>Table</strong></td><td>${table || 'Unknown'}</td></tr>
      <tr><td><strong>Record ID</strong></td><td>${record?.id || 'N/A'}</td></tr>
    `;
  }

  const emailBody = `
    <div style="font-family: sans-serif; max-width: 500px; margin: auto;">
      <div style="background: #1e1b4b; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="color: #fff; margin: 0;">🌙 Night Crew Challenge</h2>
        <p style="color: #a5b4fc; margin: 4px 0 0;">Admin approval needed</p>
      </div>
      <div style="background: #f8f8f8; padding: 20px; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          ${details}
        </table>
        <div style="margin-top: 24px; text-align: center;">
          <a href="https://night-crew.vercel.app" 
             style="background: #4f46e5; color: white; padding: 12px 24px; 
                    border-radius: 6px; text-decoration: none; font-weight: bold;">
            Go to Admin Panel →
          </a>
        </div>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 12px;">
        Night Crew Challenge · Sam's Club
      </p>
    </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'NightCrew <onboarding@resend.dev>',
      to: 'sergiolara@gmail.com', // 👈 replace with your actual email
      subject,
      html: emailBody,
    })
  });

  return res.status(200).json({ success: true });
}
