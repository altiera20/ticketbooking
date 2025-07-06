import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import config from '../config';
import logger from '../utils/logger.utils';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType: string;
  }[];
}

interface TemplateData {
  [key: string]: any;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private defaultFrom: string;
  private templatesDir: string;
  private isUsingMockTransport: boolean = false;

  constructor() {
    this.defaultFrom = `"${config.email.fromName}" <${config.email.fromEmail}>`;
    this.templatesDir = path.join(__dirname, '../templates');

    // Check if we're using default credentials
    const usingDefaultCredentials = 
      config.email.user === 'your_email@gmail.com' || 
      config.email.password === 'your_email_app_password';

    if (usingDefaultCredentials) {
      // Use mock transporter for development
      this.isUsingMockTransport = true;
      this.transporter = nodemailer.createTransport({
        jsonTransport: true
      });
      logger.info('Using mock email transport - emails will be logged but not sent');
    } else {
      // Use real transporter
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
      });
      // Verify connection
      this.verifyConnection();
    }
  }

  private async verifyConnection(): Promise<void> {
    try {
      if (!this.isUsingMockTransport) {
        await this.transporter.verify();
        logger.info('Email service connected successfully');
      }
    } catch (error) {
      logger.error('Failed to connect to email service', error);
      // Fallback to mock transport if verification fails
      this.isUsingMockTransport = true;
      this.transporter = nodemailer.createTransport({
        jsonTransport: true
      });
      logger.info('Falling back to mock email transport - emails will be logged but not sent');
    }
  }

  private async renderTemplate(templateName: string, data: TemplateData): Promise<string> {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.html`);
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const template = handlebars.compile(templateContent);
      return template(data);
    } catch (error) {
      logger.error(`Failed to render email template: ${templateName}`, error);
      throw new Error(`Failed to render email template: ${templateName}`);
    }
  }

  public async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: options.from || this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      if (this.isUsingMockTransport) {
        logger.info(`Mock email sent to ${options.to} with subject: ${options.subject}`);
        logger.debug('Email content:', (info as any).message);
      } else {
        logger.info(`Email sent: ${info.messageId}`);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to send email', error);
      return false;
    }
  }

  public async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    username: string
  ): Promise<boolean> {
    try {
      const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
      const html = await this.renderTemplate('forgot-password', {
        username,
        resetUrl,
        expiresIn: '1 hour',
        year: new Date().getFullYear(),
        appName: config.appName,
      });

      return await this.sendEmail({
        to,
        subject: 'Reset Your Password',
        html,
      });
    } catch (error) {
      logger.error('Failed to send password reset email', error);
      return false;
    }
  }

  public async sendPasswordResetSuccessEmail(
    to: string,
    username: string
  ): Promise<boolean> {
    try {
      const html = await this.renderTemplate('password-reset-success', {
        username,
        loginUrl: `${config.clientUrl}/login`,
        year: new Date().getFullYear(),
        appName: config.appName,
      });

      return await this.sendEmail({
        to,
        subject: 'Password Reset Successful',
        html,
      });
    } catch (error) {
      logger.error('Failed to send password reset success email', error);
      return false;
    }
  }

  public async sendWelcomeEmail(
    to: string,
    username: string
  ): Promise<boolean> {
    try {
      const html = await this.renderTemplate('welcome-email', {
        username,
        loginUrl: `${config.clientUrl}/login`,
        year: new Date().getFullYear(),
        appName: config.appName,
      });

      return await this.sendEmail({
        to,
        subject: `Welcome to ${config.appName}!`,
        html,
      });
    } catch (error) {
      logger.error('Failed to send welcome email', error);
      return false;
    }
  }

  public async sendBookingConfirmation(
    to: string,
    username: string,
    referenceNumber: string,
    eventTitle: string,
    eventDate: Date,
    ticketPdf: Buffer
  ): Promise<boolean> {
    try {
      const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const html = await this.renderTemplate('booking-confirmation', {
        username,
        referenceNumber,
        eventTitle,
        eventDate: formattedDate,
        profileUrl: `${config.clientUrl}/profile`,
        year: new Date().getFullYear(),
        appName: config.appName,
      });

      return await this.sendEmail({
        to,
        subject: `Booking Confirmation - ${referenceNumber}`,
        html,
        attachments: [
          {
            filename: `ticket-${referenceNumber}.pdf`,
            content: ticketPdf,
            contentType: 'application/pdf',
          },
        ],
      });
    } catch (error) {
      logger.error('Failed to send booking confirmation email', error);
      return false;
    }
  }

  public async sendBookingCancellation(
    to: string,
    username: string,
    referenceNumber: string,
    eventTitle: string,
    eventDate: Date
  ): Promise<boolean> {
    try {
      const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const html = await this.renderTemplate('booking-cancellation', {
        username,
        referenceNumber,
        eventTitle,
        eventDate: formattedDate,
        profileUrl: `${config.clientUrl}/profile`,
        eventsUrl: `${config.clientUrl}/events`,
        year: new Date().getFullYear(),
        appName: config.appName,
      });

      return await this.sendEmail({
        to,
        subject: `Booking Cancellation - ${referenceNumber}`,
        html,
      });
    } catch (error) {
      logger.error('Failed to send booking cancellation email', error);
      return false;
    }
  }
}

export default new EmailService();