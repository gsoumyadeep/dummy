const nodemailer = require('nodemailer');

// Create a transporter using Gmail's SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'prithviramesh7@gmail.com', // Your Gmail address
    pass: 'llulfdcdzqxsbbwr',   // Your Gmail password (or app password)
  },
});

// Email options
const mailOptions = {
  from: '"KBR" <osm@kbr.com>',           // Sender address
  to: 'ramrocks881@gmail.com, gamer280504@gmail.com',           // Receiver's email address
  subject: 'Conference Room Booking',    // Subject line
  text: 'Your conference room booking has been confirmed!',  // Email body
};

// Send the email
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.log('Error sending email:', error);
  }
  console.log('Email sent: ' + info.response);
});
