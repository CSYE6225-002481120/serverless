import mysql from 'mysql2/promise';
import moment from 'moment';
import sgMail from '@sendgrid/mail';
import AWS from 'aws-sdk';

const secretsManager = new AWS.SecretsManager();

export const handler = async (event) => {
  let connection;

  try {

    const secretArn = process.env.SECRET_ARN;
    const secret = await secretsManager.getSecretValue({ SecretId: secretArn }).promise();
    const envVariables = JSON.parse(secret.SecretString);

    console.log("Environment Variables:", envVariables);

  
    const {
      RDS_HOST: rdsHost,
      SENDGRID_API_KEY: sendGridApiKey,
      RDS_USERNAME: rdsUsername,
      RDS_PASSWORD: rdsPassword,
      RDS_DB_NAME: rdsDB,
      DOMAIN: domain,
    } = envVariables;

    
    sgMail.setApiKey(sendGridApiKey);

  
    const rdsConfig = {
      host: rdsHost,
      user: rdsUsername,
      password: rdsPassword,
      database: rdsDB,
    };

    
    const snsMessage = JSON.parse(event.Records[0].Sns.Message);
    const { email, token } = snsMessage;

    // **Generate Verification Link**
    const verificationLink = `https://${domain}/verify?token=${token}`;

    // **Email Content**
    const msg = {
      to: email,
      from: `no-reply@${domain}`, // Use the domain from secrets
      subject: 'Verify Your Email',
      text: `Please verify your email by clicking the following link. The link will expire in 1 minute.\n\n${verificationLink}`,
    };

    
    connection = await mysql.createConnection(rdsConfig);

    // **Calculate Token Expiration Time (1 minute from now)**
    const expirationTime = moment().add(1, 'minutes').toDate();

    
    await connection.execute(
      'UPDATE Users SET verificationToken = ?, tokenExpiration = ? WHERE email = ?',
      [token, expirationTime, email]
    );

    
    await sgMail.send(msg);
    console.log(`Verification email sent to ${email}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'Email sent successfully' }),
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send verification email' }),
    };
  } finally {
   
    if (connection) {
      await connection.end();
    }
  }
};
