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

async function sendSubscriptionWelcomeEmail(recipientEmail) {
  const subject = `You are subscribed to Harshil Goyal's Web Services!`;
  
  const textBody = `
Hi there,

Thank you for subscribing to Harshil Goyal's Web Development Services!

You are now subscribed to receive agency updates, web design insights, and exclusive service offers.

If you ever need a custom website, web application, or redesign, feel free to reach out anytime at:
Email: arveharshil@gmail.com
Phone: +91 8968929568
Website: https://harshilgoyalup.github.io/

Best regards,
Harshil Goyal — Web Development Services
`;

  const htmlBody = `
    <div style="font-family: 'Geist', Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 28px; border: 1px solid #e2e2e2; color: #111111; background-color: #ffffff; border-radius: 6px;">
      <div style="border-bottom: 2px solid #111111; padding-bottom: 14px; margin-bottom: 20px;">
        <h2 style="font-size: 20px; font-weight: 800; letter-spacing: -0.03em; margin: 0; color: #111111;">Harshil Goyal — Web Services</h2>
        <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 4px 0 0;">Subscription Confirmed</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #111111; margin-bottom: 16px;">Hi there,</p>

      <p style="font-size: 15px; line-height: 1.6; color: #333333; margin-bottom: 20px;">
        Thank you for subscribing! You are now subscribed to receive web design insights, technical updates, and exclusive agency offers from <strong>Harshil Goyal's Web Development Services</strong>.
      </p>

      <div style="background-color: #f7f7f7; padding: 18px; border: 1px solid #e2e2e2; border-radius: 4px; margin-bottom: 24px;">
        <p style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #666666; margin: 0 0 8px;">Direct Contact Information</p>
        <p style="font-size: 13.5px; line-height: 1.6; color: #111111; margin: 0;">
          <strong>Email:</strong> <a href="mailto:arveharshil@gmail.com" style="color: #111111; text-decoration: underline;">arveharshil@gmail.com</a><br/>
          <strong>Phone / WhatsApp:</strong> +91 8968929568<br/>
          <strong>GitHub:</strong> <a href="https://github.com/harshilgoyalup" style="color: #111111; text-decoration: underline;">github.com/harshilgoyalup</a>
        </p>
      </div>

      <p style="font-size: 13px; color: #666666; margin-bottom: 24px;">
        If you have an upcoming project or need a custom web solution, feel free to reply directly to this email anytime.
      </p>

      <div style="border-top: 1px solid #e2e2e2; padding-top: 16px; font-size: 11px; color: #999999; text-align: center;">
        Harshil Goyal Web Development Services &copy; ${new Date().getFullYear()}
      </div>
    </div>
  `;

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: (process.env.SMTP_PORT === '465'),
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      await transporter.sendMail({
        from: `"Harshil Goyal Web Services" <${smtpUser}>`,
        to: recipientEmail,
        subject: subject,
        text: textBody,
        html: htmlBody
      });

      console.log(`Subscription welcome email successfully sent to ${recipientEmail}.`);
      return true;
    } catch (err) {
      console.error('Failed to send subscription welcome email via SMTP:', err.message);
    }
  }

  // Log fallback
  const timestamp = new Date().toISOString();
  const logMessage = `\n[${timestamp}] --- WELCOME EMAIL --- \nTO: ${recipientEmail}\nSUBJECT: ${subject}\n${textBody}\n----------------------------\n`;
  try {
    fs.appendFileSync(logFilePath, logMessage);
  } catch (err) {
    console.error('Failed to write welcome email to log:', err);
  }

  return false;
}

module.exports = {
  sendInquiryNotification,
  sendSubscriptionWelcomeEmail
};
