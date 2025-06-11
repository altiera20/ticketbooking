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
}

interface TemplateData {
  [key: string]: any;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private defaultFrom: string;
  private templatesDir: string;

  constructor() {
    this.defaultFrom = `"${config.email.fromName}" <${config.email.fromEmail}>`;
    this.templatesDir = path.join(__dirname, '../templates');

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

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info('Email service connected successfully');
    } catch (error) {
      logger.error('Failed to connect to email service', error);
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
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
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
}

export default new EmailService();