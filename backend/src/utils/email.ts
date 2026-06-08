/**
 * Email Service
 * Sends emails for password notifications and other communications
 */

import nodemailer from 'nodemailer';

const emailConfig = {
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  } : undefined,
};

const transporter = nodemailer.createTransport(emailConfig);

/**
 * Send exam password to student
 */
export const sendExamPasswordEmail = async (
  studentEmail: string,
  studentName: string,
  password: string,
  examDate: Date,
  courseName: string
) => {
  try {
    const validDate = examDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@education.com',
      to: studentEmail,
      subject: `Exam Password - ${courseName} (${validDate})`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Your Exam Password</h2>
          <p>Dear ${studentName},</p>
          
          <p>Your temporary password for the exam on <strong>${validDate}</strong> has been generated:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 12px; color: #666;">Course: ${courseName}</p>
            <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; font-family: monospace; letter-spacing: 2px;">${password}</p>
          </div>
          
          <p style="color: #d9534f; font-weight: bold;">⚠️ Important Notes:</p>
          <ul style="color: #666;">
            <li>This password is valid <strong>ONLY on ${validDate}</strong> (00:00 - 23:59)</li>
            <li>The password will <strong>NOT work before or after exam date</strong></li>
            <li>Keep this email secure and do not share your password</li>
            <li>If you don't receive the exam portal link, contact your branch administrator</li>
          </ul>
          
          <p style="margin-top: 30px; font-size: 12px; color: #999;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    // Don't throw - email failures shouldn't block password generation
    return false;
  }
};

/**
 * Send password distribution summary to branch admin
 */
export const sendPasswordDistributionEmail = async (
  adminEmail: string,
  adminName: string,
  examDate: Date,
  courseName: string,
  studentCount: number,
  successCount: number,
  failureCount: number
) => {
  try {
    const validDate = examDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@education.com',
      to: adminEmail,
      subject: `Exam Password Distribution Report - ${courseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Password Generation Report</h2>
          <p>Dear ${adminName},</p>
          
          <p>Exam passwords have been generated for <strong>${courseName}</strong> on <strong>${validDate}</strong>:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Students</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${studentCount}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Passwords Sent</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; color: #27ae60;">${successCount}</td>
            </tr>
            ${failureCount > 0 ? `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Failed to Send</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; color: #e74c3c;">${failureCount}</td>
            </tr>
            ` : ''}
          </table>
          
          <p>You can view and manage all exam passwords in the admin dashboard.</p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #999;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

/**
 * Verify email configuration
 */
export const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};
