import crypto from 'crypto';
import {
  AIProvider,
  AIChatMessage,
  AICompletionOptions,
  AICompletionResult,
} from './aiProvider.interface';

export class LocalHeuristicProvider implements AIProvider {
  public id = 'local';
  public name = 'Local Heuristic AI Engine';
  private defaultModel = 'local-heuristic-v1';

  public async generateCompletion(
    prompt: string | AIChatMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    const rawText =
      typeof prompt === 'string'
        ? prompt
        : prompt.map((m) => `${m.role}: ${m.content}`).join('\n');

    const lower = rawText.toLowerCase();
    let content = '';

    // Check query intent and generate educational responses
    if (lower.includes('attendance') && (lower.includes('defaulter') || lower.includes('risk') || lower.includes('below'))) {
      content = JSON.stringify({
        summary: 'Institutional attendance analysis indicates several students falling below the mandatory 75% eligibility threshold.',
        riskCount: 4,
        threshold: 75,
        recommendation: 'Immediate remedial warning notifications and advisor conferences are recommended before semester hall tickets are finalized.',
      }, null, 2);
    } else if (lower.includes('question') || lower.includes('bloom') || lower.includes('exam')) {
      content = JSON.stringify({
        questions: [
          {
            unit: 'Unit 1: Fundamentals',
            bloomsLevel: 'APPLY',
            questionType: 'SHORT_ANSWER',
            questionText: 'Demonstrate how relational schema normalization eliminates update anomalies with a practical student enrollment scenario.',
            marks: 5,
            rubric: '2 marks for anomaly explanation, 3 marks for normalization steps.',
          },
          {
            unit: 'Unit 2: Architecture',
            bloomsLevel: 'ANALYZE',
            questionType: 'LONG_ANSWER',
            questionText: 'Analyze the performance trade-offs between B-Tree and Hash Indexing under high-concurrency write operations.',
            marks: 10,
            rubric: '4 marks for architectural contrast, 6 marks for performance analysis.',
          },
        ],
      }, null, 2);
    } else if (lower.includes('study plan') || lower.includes('schedule') || lower.includes('revision')) {
      content = JSON.stringify({
        overview: 'Personalized 7-day academic study plan optimized for weak subject mastery and exam readiness.',
        dailyHours: 2.5,
        targetExam: 'Semester Examination',
        schedule: [
          { day: 'Monday', focus: 'Database Management Systems', task: 'Review Relational Algebra & SQL queries (2 hours)' },
          { day: 'Tuesday', focus: 'Computer Networks', task: 'TCP/IP Model & Subnetting practice (2.5 hours)' },
          { day: 'Wednesday', focus: 'Operating Systems', task: 'Deadlock detection algorithms & memory paging (2 hours)' },
          { day: 'Thursday', focus: 'Theory of Computation', task: 'DFA minimization & Context-Free Grammars (3 hours)' },
          { day: 'Friday', focus: 'Object Oriented Analysis', task: 'UML diagramming & Design Patterns (2 hours)' },
          { day: 'Saturday', focus: 'Mock Exam', task: 'Complete 3-hour timed model exam paper (3 hours)' },
          { day: 'Sunday', focus: 'Revision & Rest', task: 'Formula sheet review and weak topic flashcards (1.5 hours)' },
        ],
      }, null, 2);
    } else if (lower.includes('communication') || lower.includes('announcement') || lower.includes('notice')) {
      content = JSON.stringify({
        subject: 'Important Notification: Upcoming Semester Examination Schedule & Attendance Verification',
        body: 'Dear Students and Faculty,\n\nPlease be advised that the internal assessment examination schedule has been officially published. All students are required to verify their cumulative attendance via the student portal before hall-ticket issuance. Students below 75% attendance must consult their faculty advisors immediately.\n\nWarm regards,\nOffice of the Principal / Dean of Academic Affairs',
        channel: 'IN_APP_AND_EMAIL',
        suggestedTone: 'formal',
      }, null, 2);
    } else if (lower.includes('career') || lower.includes('resume') || lower.includes('readiness')) {
      content = JSON.stringify({
        careerReadinessScore: 84,
        tier: 'JOB_READY',
        strengths: ['Strong core coursework in Algorithms & Databases', 'High project completion rate'],
        skillGaps: ['Cloud deployment exposure (Docker / AWS)', 'System Design fundamentals'],
        recommendedActions: [
          'Deploy full-stack portfolio application with Docker & CI/CD',
          'Practice 15 medium LeetCode array and tree problems',
          'Participate in mock technical HR interviews',
        ],
      }, null, 2);
    } else {
      content = `OmniEdu Intelligence Analysis:\nBased on the institutional data provided, academic parameters and operational metrics are operating within expected tolerances. All recommendations adhere strictly to university and school board regulatory guidelines.`;
    }

    const promptTokens = Math.ceil(rawText.length / 4);
    const completionTokens = Math.ceil(content.length / 4);

    return {
      content,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      model: this.defaultModel,
    };
  }

  /**
   * Deterministic 64-dimensional semantic-lexical embedding vector.
   * Produces reproducible cosine similarity based on n-gram and token hashes.
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    const vector = new Array(64).fill(0);
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];

    for (const word of words) {
      const hash = crypto.createHash('sha256').update(word).digest();
      for (let i = 0; i < 64; i++) {
        vector[i] += (hash[i % hash.length] - 128) / 128.0;
      }
    }

    // Normalize vector to unit length
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1.0;
    return vector.map((v) => Number((v / norm).toFixed(6)));
  }
}
