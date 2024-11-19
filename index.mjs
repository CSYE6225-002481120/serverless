import mysql from 'mysql2';
import moment from 'moment';
import sgMail from '@sendgrid/mail';

// Set your SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Configure RDS connection parameters
const rdsConfig = {
  host: process.env.RDS_HOST, // RDS endpoint
  user: process.env.RDS_USERNAME, // RDS username
  password: process.env.RDS_PASSWORD, // RDS password
  database: process.env.RDS_DB_NAME, // RDS database name
};

export const handler = async (event) => {
  let connection;

  try {
    // Parse the SNS message
    const snsMessage = JSON.parse(event.Records[0].Sns.Message);
    const { email, token } = snsMessage;

    // Generate a verification link
    const verificationLink = `https://demo.vardhan.click/verify?token=${token}`;

    // Email content
    const msg = {
      to: email,
      from: 'no-reply@demo.vardhan.click', // Verified domain sender email
      subject: 'Verify Your Email',
      text: `Please verify your email by clicking the following link. The link will expire in 1 minute.\n\n${verificationLink}`,
    };

    // Connect to RDS
    connection = await mysql.createConnection(rdsConfig);

    // Calculate token expiration time (1 minute from now)
    const expirationTime = moment().add(1, 'minutes').toDate();

    // Update the user's verification token and expiration time in RDS
    await connection.execute(
      'UPDATE Users SET verificationToken = ?, tokenExpiration = ? WHERE email = ?',
      [token, expirationTime, email]
    );

    // Send the email using SendGrid
    await sgMail.send(msg);
    console.log(`Verification email sent to ${email}`);

    return { status: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send verification email');
  } finally {
    // Close the RDS connection
    if (connection) {
      await connection.end();
    }
  }
};
