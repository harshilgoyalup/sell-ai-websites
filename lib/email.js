const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const logFilePath = process.env.VERCEL
  ? path.join('/tmp', 'emails.log')
  : path.join(__dirname, '../database/emails.log');

// Ensure database directory exists for logging
const dbDir = path.dirname(logFilePath);
if (!process.env.VERCEL && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

async function sendInquiryNotification(inquiry) {
  const targetEmail = process.env.NOTIFICATION_EMAIL || 'arveharshil@gmail.com';
  
  // Format the email body
  const textBody = `
New Project Inquiry Received!
=================================
Client Details:
- Name: ${inquiry.fullName}
- Email: ${inquiry.email}
- WhatsApp: ${inquiry.whatsapp}
- Company: ${inquiry.company || '—'}

Project details:
- Project Type: ${inquiry.projectType}
- Website: ${inquiry.website || '—'}
- Budget: ${inquiry.budget}
- Timeline: ${inquiry.timeline}

Description:
${inquiry.description}

=================================
View this inquiry and follow up in the admin panel:
http://localhost:3000/admin/inquiries/${inquiry.id}
`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e2e2; color: #1a1c1c; background-color: #ffffff;">
      <h2 style="border-bottom: 2px solid #000000; padding-bottom: 10px; font-weight: 700; letter-spacing: -0.02em;">New Project Inquiry Received</h2>
      
      <h3 style="color: #5e5e5e; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 20px;">Client Profile</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 6px 0; font-weight: bold; width: 120px; color: #5e5e5e;">Name</td>
          <td style="padding: 6px 0; font-weight: bold;">${inquiry.fullName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #5e5e5e;">Email</td>
          <td style="padding: 6px 0;"><a href="mailto:${inquiry.email}" style="color: #000000; text-decoration: underline;">${inquiry.email}</a></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #5e5e5e;">WhatsApp</td>
          <td style="padding: 6px 0;"><a href="https://wa.me/${inquiry.whatsapp.replace(/[^\d+]/g, '')}" style="color: #000000; text-decoration: underline;">${inquiry.whatsapp}</a></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #5e5e5e;">Company</td>
          <td style="padding: 6px 0;">${inquiry.company || '—'}</td>
        </tr>
      </table>

      <h3 style="color: #5e5e5e; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 20px;">Project Scope</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 6px 0; color: #5e5e5e; width: 120px;">Project Type</td>
          <td style="padding: 6px 0; font-weight: bold;">${inquiry.projectType}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #5e5e5e;">Budget Range</td>
          <td style="padding: 6px 0;">${inquiry.budget}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #5e5e5e;">Timeline</td>
          <td style="padding: 6px 0;">${inquiry.timeline}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #5e5e5e;">Current Site</td>
          <td style="padding: 6px 0;">${inquiry.website ? `<a href="${inquiry.website}" style="color: #000000; text-decoration: underline;">${inquiry.website}</a>` : '—'}</td>
        </tr>
      </table>

      <h3 style="color: #5e5e5e; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 20px;">Description</h3>
      <div style="background-color: #f9f9f9; padding: 15px; border: 1px solid #e2e2e2; border-radius: 2px; white-space: pre-wrap; font-size: 14px; line-height: 1.5; color: #1a1c1c; margin-bottom: 25px;">${inquiry.description}</div>

      <div style="text-align: center; margin-top: 20px;">
        <a href="http://localhost:3000/admin/inquiries/${inquiry.id}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 12px 25px; font-weight: bold; font-size: 14px; border-radius: 2px;">View Inquiry in Admin Panel</a>
      </div>
    </div>
  `;

  const subject = `New Website Project Inquiry from ${inquiry.fullName}`;

  // Check if SMTP is configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: (process.env.SMTP_PORT === '465'),
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      await transporter.sendMail({
        from: `"Harshil Goyal Portfolio" <${smtpUser}>`,
        to: targetEmail,
        subject: subject,
        text: textBody,
        html: htmlBody
      });

      console.log(`Email successfully dispatched to ${targetEmail} via SMTP.`);
      return true;
    } catch (smtpError) {
      console.error('SMTP email dispatch failed. Falling back to local logging. Error:', smtpError.message);
    }
  }

  // Graceful Fallback: write to emails.log file
  const timestamp = new Date().toISOString();
  const logMessage = `\n[${timestamp}] ----------------------------------------\nTO: ${targetEmail}\nSUBJECT: ${subject}\n${textBody}\n----------------------------------------\n`;
  
  try {
    fs.appendFileSync(logFilePath, logMessage);
    console.log(`[Email Log Fallback] Notification stored in: ${path.normalize(logFilePath)}`);
  } catch (fsError) {
    console.error('Failed to write email notification to log file:', fsError);
  }

  return false;
}

module.exports = {
  sendInquiryNotification
};
