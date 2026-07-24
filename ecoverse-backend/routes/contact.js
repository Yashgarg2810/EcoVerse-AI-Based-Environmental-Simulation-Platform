const express = require('express');
const prisma = require('../prisma/db');
const nodemailer = require('nodemailer');

const router = express.Router();

// ─── POST /api/contact ─────────────────────────────────────────────────────────
// Body: { name, organization, email, phone, subject, message }
router.post('/', async (req, res) => {
  try {
    const { name, organization, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !organization || !email || !subject || !message) {
      return res.status(400).json({ error: 'Name, Organization, Email, Subject, and Message are required.' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Message length validation (e.g. 1000 characters)
    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message cannot exceed 1000 characters.' });
    }

    // Store submission in database using Prisma
    const savedMessage = await prisma.contactMessage.create({
      data: {
        name,
        organization,
        email,
        phone: phone || null,
        subject,
        message
      }
    });

    // Send real email via Nodemailer
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        const mailOptions = {
          from: `"EcoVerse Inquiry" <${smtpUser}>`,
          to: 'yashgarg2810@gmail.com',
          replyTo: email,
          subject: `[EcoVerse Inquiry] ${subject} - ${organization}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #191c1e; max-width: 600px; border: 1px solid #e0e3e5; border-radius: 12px;">
              <h2 style="color: #00652c; margin-top: 0;">New Contact Inquiry Received</h2>
              <p>You have received a new message through the EcoVerse contact page.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eceef0; width: 130px;">Name:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eceef0;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eceef0;">Organization:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eceef0;">${organization}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eceef0;">Email:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eceef0;"><a href="mailto:${email}">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eceef0;">Phone:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eceef0;">${phone || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eceef0;">Subject:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eceef0;">${subject}</td>
                </tr>
              </table>

              <p style="font-weight: bold; margin-bottom: 5px;">Message Body:</p>
              <div style="background-color: #f2f4f6; padding: 15px; border-radius: 8px; font-style: italic; border-left: 4px solid #00652c;">
                ${message.replace(/\n/g, '<br>')}
              </div>
              
              <hr style="border: none; border-top: 1px solid #e0e3e5; margin: 25px 0;">
              <p style="font-size: 11px; color: #6f7a6e; text-align: center; margin: 0;">This email was automatically generated and forwarded by the EcoVerse Local Host Server.</p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✉️ [SMTP SUCCESS] Inquiry email from ${name} forwarded successfully to yashgarg2810@gmail.com`);
      } catch (mailErr) {
        console.error('❌ [SMTP ERROR] Failed to send email via SMTP transporter:', mailErr.message);
      }
    } else {
      console.log('⚠️ [SMTP WARNING] SMTP credentials not set in .env. Storing message in database only. To receive emails in your inbox, set SMTP_USER and SMTP_PASS (Gmail App Password) in your .env file.');
    }

    res.status(201).json({
      success: true,
      message: 'Thank you for contacting EcoVerse! Our team will reach out to you within 24–48 hours.',
      data: savedMessage
    });
  } catch (err) {
    console.error('[contact-api] Error storing contact message:', err.message);
    res.status(500).json({ error: 'Internal Server Error. Failed to submit message.' });
  }
});

module.exports = router;
