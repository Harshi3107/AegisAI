import sgMail from '@sendgrid/mail';

const hasValidSendGridKey = typeof process.env.SENDGRID_API_KEY === 'string' && process.env.SENDGRID_API_KEY.startsWith('SG.');

if (hasValidSendGridKey) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const defaultSender = process.env.SENDGRID_FROM_EMAIL || 'noreply@agesisai.com';

const sendMail = async ({ to, subject, html, templateId, dynamicTemplateData }) => {
  if (!hasValidSendGridKey) {
    return { success: true, message: 'SendGrid not configured, email skipped' };
  }

  const message = {
    to,
    from: defaultSender,
    subject
  };

  if (templateId) {
    message.templateId = templateId;
    message.dynamicTemplateData = dynamicTemplateData;
  } else {
    message.html = html;
  }

  const result = await sgMail.send(message);
  return { success: true, data: result };
};

const buildTemplateData = (firstName, email, phone, policyDetails = {}) => ({
  firstName,
  email,
  phone,
  plan: policyDetails.plan || 'Standard',
  coverage: policyDetails.coverage || '100,000',
  premium: policyDetails.premium || '999',
  status: policyDetails.status || 'Active'
});

/**
 * Send welcome email with policy information
 * @param {string} email - User's email address
 * @param {string} firstName - User's first name
 * @param {string} phone - User's phone number
 * @returns {Promise}
 */
export const sendWelcomeEmail = async (email, firstName, phone) => {
  try {
    const templateId = process.env.SENDGRID_WELCOME_TEMPLATE_ID;

    // Skip if no API key (for development without SendGrid)
    if (!process.env.SENDGRID_API_KEY) {
      console.log(`📧 Welcome email would be sent to: ${email}`);
      return { success: true, message: 'SendGrid not configured, email skipped' };
    }

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Welcome to Agesis AI</h1>
            <p style="margin: 10px 0 0 0;">Your Environmental Insurance Partner</p>
          </div>
          
          <div style="border: 1px solid #e0e0e0; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Hello ${firstName}! ✨</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Thank you for registering with <strong>Agesis AI</strong>. We're thrilled to have you on board with us.
            </p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #667eea; margin-top: 0;">Your Account Details</h3>
              <p style="margin: 10px 0;"><strong>Phone:</strong> ${phone}</p>
              <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
            </div>
            
            <h3 style="color: #333;">📋 Next Steps:</h3>
            <ol style="color: #666; line-height: 1.8;">
              <li>Complete your KYC verification on the platform</li>
              <li>Select your insurance plan based on your risk profile</li>
              <li>Set up your payment method (UPI)</li>
              <li>Activate your policy to start coverage</li>
            </ol>
            
            <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
              <h3 style="color: #2e7d32; margin-top: 0;">🌍 What We Offer:</h3>
              <ul style="color: #555;">
                <li><strong>Environmental Monitoring:</strong> Real-time AQI and weather tracking</li>
                <li><strong>Claims Management:</strong> Quick and easy claim filing</li>
                <li><strong>Risk Assessment:</strong> Personalized premium rates based on location</li>
                <li><strong>Flexible Plans:</strong> Choose coverage that fits your needs</li>
              </ul>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
              <strong>Need help?</strong> Contact our support team at support@agesisai.com or call +91-XXXX-XXXX-XX
            </p>
            
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
              © 2026 Agesis AI. All rights reserved. | This is an automated message, please do not reply.
            </p>
          </div>
        </div>
      `;

    const result = await sendMail({
      to: email,
      subject: 'Welcome to Agesis AI - Your Insurance Policy is Ready',
      html,
      templateId,
      dynamicTemplateData: buildTemplateData(firstName, email, phone)
    });

    console.log(`✅ Welcome email sent to ${email}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error.message);
    // Don't throw - email sending shouldn't block user registration
    return { success: false, message: error.message };
  }
};

/**
 * Send policy document email
 * @param {string} email - User's email address
 * @param {string} firstName - User's first name
 * @param {object} policyDetails - Policy details (plan, premium, etc.)
 * @returns {Promise}
 */
export const sendPolicyEmail = async (email, firstName, policyDetails) => {
  try {
    const templateId = process.env.SENDGRID_POLICY_TEMPLATE_ID;

    if (!process.env.SENDGRID_API_KEY) {
      console.log(`📧 Policy email would be sent to: ${email}`);
      return { success: true, message: 'SendGrid not configured, email skipped' };
    }

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Policy Document</h1>
            <p style="margin: 10px 0 0 0;">Environmental Insurance Policy</p>
          </div>
          
          <div style="border: 1px solid #e0e0e0; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Hello ${firstName},</h2>
            
            <p style="color: #666;">Your insurance policy has been activated. Here are your policy details:</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #667eea; margin-top: 0;">Policy Details</h3>
              <table style="width: 100%; color: #555;">
                <tr style="border-bottom: 1px solid #e0e0e0;">
                  <td style="padding: 10px 0;"><strong>Plan:</strong></td>
                  <td style="padding: 10px 0; text-align: right;">${policyDetails.plan || 'Standard'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e0e0e0;">
                  <td style="padding: 10px 0;"><strong>Coverage:</strong></td>
                  <td style="padding: 10px 0; text-align: right;">₹${policyDetails.coverage || '100,000'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e0e0e0;">
                  <td style="padding: 10px 0;"><strong>Premium:</strong></td>
                  <td style="padding: 10px 0; text-align: right;">₹${policyDetails.premium || '999'}/month</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;"><strong>Status:</strong></td>
                  <td style="padding: 10px 0; text-align: right;"><span style="color: #4caf50; font-weight: bold;">Active</span></td>
                </tr>
              </table>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="color: #856404; margin: 0;">
                <strong>📌 Important:</strong> Your policy is now active. Keep this email for your records. You can now file environmental damage claims.
              </p>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
              <strong>Questions?</strong> Contact support@agesisai.com
            </p>
          </div>
        </div>
      `;

    const result = await sendMail({
      to: email,
      subject: 'Your Insurance Policy Document - Agesis AI',
      html,
      templateId,
      dynamicTemplateData: buildTemplateData(firstName, email, policyDetails.phone, policyDetails)
    });

    console.log(`✅ Policy email sent to ${email}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Error sending policy email:', error.message);
    return { success: false, message: error.message };
  }
};

export default {
  sendWelcomeEmail,
  sendPolicyEmail
};
