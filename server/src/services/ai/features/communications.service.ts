import { getAIProvider } from '../providers/aiProvider.factory';
import { InstitutionContext as TenantContext } from '../../../config/prisma';
import { AppError } from '../../../middleware/errorHandler';

export interface CommunicationDraftParams {
  type: 'ANNOUNCEMENT' | 'PARENT_ALERT' | 'ATTENDANCE_WARNING' | 'FEE_REMINDER' | 'ACADEMIC_NOTICE';
  tone: 'formal' | 'friendly' | 'concise' | 'detailed';
  contextDetails: {
    title?: string;
    studentName?: string;
    targetAudience?: string;
    attendancePercentage?: number;
    feeAmount?: number;
    dueDate?: string;
    keyPoints?: string[];
  };
}

export class CommunicationsService {
  /**
   * Draft institutional communications with configurable tone and context.
   */
  public static async draftCommunication(params: CommunicationDraftParams, ctx: TenantContext) {
    if (!ctx.institutionId) {
      throw new AppError('Tenant context required', 400);
    }

    const provider = getAIProvider();
    const prompt = `Draft an educational communication for an educational institution.
Type: ${params.type}
Tone: ${params.tone}
Audience: ${params.contextDetails.targetAudience || 'Students & Parents'}
Key Context Data:
${JSON.stringify(params.contextDetails, null, 2)}

Output strictly as a JSON object with:
- subject: string
- body: string (formatted email / circular text)
- suggestedChannel: "IN_APP" | "EMAIL" | "SMS"
- requiresHumanApproval: boolean (true)`;

    const completion = await provider.generateCompletion(prompt, {
      responseFormat: 'json',
      temperature: 0.2,
    });

    let draft: any;
    try {
      draft = JSON.parse(completion.content);
    } catch {
      draft = {
        subject: `Notice regarding ${params.type.replace('_', ' ')}`,
        body: `Dear recipient,\n\nPlease find the official update regarding ${params.type.toLowerCase()}.\nKey points: ${(params.contextDetails.keyPoints || []).join(', ')}.\n\nRegards,\nOffice of the Principal`,
        suggestedChannel: 'EMAIL',
        requiresHumanApproval: true,
      };
    }

    return {
      subject: draft.subject || `Notice regarding ${params.type.replace('_', ' ')}`,
      body: draft.body || 'Official institutional communication text.',
      suggestedChannel: draft.suggestedChannel || 'EMAIL',
      requiresHumanApproval: true,
      draft,
      governance: {
        isApproved: false,
        note: 'AI drafts must be verified and authorized by an administrator or faculty member before transmission.',
      },
    };
  }
}
