const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendStudentOTP(email, otp) {
  const mailOptions = {
    from: `"VSL Learning" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your Registration OTP - VSL Learning',
    html: `
      <h2>Welcome to VSL Learning!</h2>
      <p>Your OTP for registration is: <strong>${otp}</strong></p>
      <p>This code will expire in 10 minutes.</p>
    `,
  };
  return transporter.sendMail(mailOptions);
}

async function sendTeacherCredentials(email, name, password) {
  const mailOptions = {
    from: `"VSL Learning" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your Teacher Account Details - VSL Learning',
    html: `
      <h2>Welcome ${name}!</h2>
      <p>An administrator has created a Teacher account for you on VSL Learning.</p>
      <p>Here are your login credentials:</p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Password:</strong> ${password}</li>
      </ul>
      <p>Please log in and change your password as soon as possible.</p>
    `,
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { sendStudentOTP, sendTeacherCredentials };
