import { logger } from '../../config/logger';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html: string;
  from?: string;
}

export interface EmailSendResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  provider: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

/**
 * LogEmailProvider — logs emails to stdout/logger and caches in-memory for testing/dev
 */
export class LogEmailProvider implements EmailProvider {
  public sentMessages: Array<EmailMessage & { sentAt: Date; messageId: string }> = [];

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const to = Array.isArray(message.to) ? message.to : [message.to];
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const record = {
      ...message,
      sentAt: new Date(),
      messageId,
    };

    this.sentMessages.push(record);

    logger.info(
      {
        messageId,
        to,
        subject: message.subject,
        provider: 'LogEmailProvider',
      },
      `[Email Dispatched] ${message.subject} to ${to.join(', ')}`
    );

    return {
      messageId,
      accepted: to,
      rejected: [],
      provider: 'LogEmailProvider',
    };
  }
}

class EmailService {
  private provider: EmailProvider;
  private defaultFrom = process.env.EMAIL_FROM || 'OmniEdu Notifications <noreply@omniedu.io>';

  constructor() {
    this.provider = new LogEmailProvider();
  }

  public setProvider(provider: EmailProvider) {
    this.provider = provider;
  }

  public getProvider(): EmailProvider {
    return this.provider;
  }

  public async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    const from = message.from || this.defaultFrom;
    return this.provider.send({
      ...message,
      from,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Template Generators
  // ───────────────────────────────────────────────────────────────────────────

  public renderAttendanceWarningTemplate(data: {
    studentName: string;
    registerNumber: string;
    courseOrClass: string;
    attendancePercent: number;
    thresholdPercent: number;
    institutionName: string;
  }): { subject: string; html: string; text: string } {
    const subject = `[ACTION REQUIRED] Attendance Defaulter Alert — ${data.studentName} (${data.attendancePercent}%)`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">${data.institutionName}</h2>
          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 14px;">OmniEdu Academic Operations</p>
        </div>
        <div style="padding: 28px; background-color: #ffffff; color: #334155;">
          <h3 style="color: #dc2626; margin-top: 0;">Notice of Attendance Below Required Threshold</h3>
          <p>Dear Student / Parent,</p>
          <p>This is an automated notification that the attendance of <strong>${data.studentName}</strong> (Reg No: <strong>${data.registerNumber}</strong>) for <strong>${data.courseOrClass}</strong> has fallen below the mandatory threshold.</p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 15px;"><strong>Current Cumulative Attendance:</strong> <span style="color: #dc2626; font-size: 18px; font-weight: bold;">${data.attendancePercent}%</span></p>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #64748b;">Minimum Required Threshold: ${data.thresholdPercent}%</p>
          </div>

          <p>As per university and institutional academic regulations, students with attendance below ${data.thresholdPercent}% may be barred from sitting for forthcoming internal and semester examinations.</p>
          <p>Please meet with your class advisor / department HOD immediately to discuss corrective remediation.</p>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">OmniEdu Multi-Tenant SaaS ERP — Automated Academic Warning System</p>
        </div>
      </div>
    `;

    const text = `Attendance Warning for ${data.studentName} (${data.registerNumber}): Current attendance is ${data.attendancePercent}%, which is below the minimum required ${data.thresholdPercent}%. Please contact your department.`;
    return { subject, html, text };
  }

  public renderFeeReceiptTemplate(data: {
    studentName: string;
    registerNumber: string;
    receiptNumber: string;
    amountPaid: number;
    balanceRemaining: number;
    feeTitle: string;
    institutionName: string;
  }): { subject: string; html: string; text: string } {
    const subject = `Fee Payment Receipt #${data.receiptNumber} — ${data.institutionName}`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">${data.institutionName}</h2>
          <p style="margin: 4px 0 0 0; color: #38bdf8; font-size: 14px;">Official Fee Receipt</p>
        </div>
        <div style="padding: 28px; background-color: #ffffff; color: #334155;">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 18px;">
            <div>
              <p style="margin: 0; font-size: 13px; color: #64748b;">Receipt Number</p>
              <h4 style="margin: 2px 0 0 0; font-size: 18px; color: #0f172a;">${data.receiptNumber}</h4>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 13px; color: #64748b;">Date</p>
              <h4 style="margin: 2px 0 0 0; font-size: 14px; color: #0f172a;">${new Date().toLocaleDateString()}</h4>
            </div>
          </div>

          <p>Received with thanks from <strong>${data.studentName}</strong> (${data.registerNumber}):</p>

          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 10px; text-align: left; font-size: 13px;">Description</th>
              <th style="padding: 10px; text-align: right; font-size: 13px;">Amount</th>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 10px; font-size: 14px;">${data.feeTitle}</td>
              <td style="padding: 12px 10px; font-size: 14px; text-align: right; font-weight: bold; color: #16a34a;">₹${data.amountPaid.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 12px 10px; font-size: 14px; color: #64748b;">Outstanding Balance Remaining</td>
              <td style="padding: 12px 10px; font-size: 14px; text-align: right; font-weight: bold; color: ${data.balanceRemaining > 0 ? '#dc2626' : '#16a34a'};">₹${data.balanceRemaining.toLocaleString()}</td>
            </tr>
          </table>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; margin-top: 20px; text-align: center;">
            <p style="margin: 0; color: #166534; font-size: 14px; font-weight: 500;">✓ Payment Confirmed and Credited to Ledger</p>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">This is an authenticated computer-generated payment voucher from OmniEdu ERP.</p>
        </div>
      </div>
    `;

    const text = `Fee Payment Receipt #${data.receiptNumber} from ${data.institutionName}: Amount ₹${data.amountPaid} paid for ${data.feeTitle} by ${data.studentName} (${data.registerNumber}). Remaining balance: ₹${data.balanceRemaining}.`;
    return { subject, html, text };
  }
}

export const emailService = new EmailService();
