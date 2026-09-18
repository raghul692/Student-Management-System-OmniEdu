export interface SafetyCheckResult {
  isSafe: boolean;
  sanitizedText: string;
  redactedPiiCount: number;
  injectionDetected: boolean;
  flaggedPatterns: string[];
}

export class SafetyFilter {
  // Regex patterns for Indian & international PII
  private static AADHAAR_REGEX = /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g;
  private static PHONE_REGEX = /\b(?:\+?91[\-\s]?)?[6-9]\d{9}\b/g;
  private static EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  private static CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/g;
  private static PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;

  // Prompt injection & jailbreak signature patterns
  private static INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior)\s+(instructions|directives|rules)/i,
    /system\s+prompt\s+override/i,
    /you\s+are\s+now\s+(DAN|unrestricted|in\s+developer\s+mode)/i,
    /bypass\s+(all\s+)?(?:safety|security|filters|protocols|rbac|role|permission|auth)/i,
    /reveal\s+(?:your\s+)?(?:secret|system|hidden)?(?:\s+system)?\s*(?:prompt|instructions)/i,
    /output\s+the\s+database\s+password/i,
    /drop\s+table\s+/i,
    /SELECT\s+[\s\S]*?\s+FROM\s+/i,
    /(?:show|access|get|fetch|leak)\s+(?:another|other|all)\s+institution/i,
    /(?:use|switch|set)\s+institutionid/i,
    /(?:list|show)\s+(?:database\s+)?tables/i,
    /(?:information_schema|pg_catalog|sqlite_master)/i,
    /(?:bypass|ignore|override)\s+(?:all\s+)?(?:rbac|role|permission|auth)/i,
    /(?:act\s+as|pretend\s+to\s+be)\s+(?:super\s*admin|platform\s*admin|root)/i,
    /(?:print|repeat|dump|echo|show)\s+(?:all\s+)?(?:system\s+prompt|initial\s+prompt|instructions\s+above)/i,
    /<system>|\[system\]|<<SYS>>/i,
  ];

  /**
   * Redact PII from input/output text before sending to AI or saving.
   * Order: Credit cards first (13-16 digits) to prevent 12-digit Aadhaar subsumption.
   */
  public static redactPII(text: string): { sanitized: string; count: number } {
    let count = 0;
    let sanitized = text;

    // 1. Payment cards (13-16 digits)
    sanitized = sanitized.replace(this.CARD_REGEX, () => {
      count++;
      return '[REDACTED_CARD]';
    });

    // 2. Aadhaar (12 digits)
    sanitized = sanitized.replace(this.AADHAAR_REGEX, () => {
      count++;
      return '[REDACTED_AADHAAR]';
    });

    // 3. PAN (10 chars alphanumeric)
    sanitized = sanitized.replace(this.PAN_REGEX, () => {
      count++;
      return '[REDACTED_PAN]';
    });

    // 4. Mobile Phone Numbers
    sanitized = sanitized.replace(this.PHONE_REGEX, () => {
      count++;
      return '[REDACTED_IDENTIFIER]';
    });

    // 5. Emails
    sanitized = sanitized.replace(this.EMAIL_REGEX, () => {
      count++;
      return '[REDACTED_EMAIL]';
    });

    return { sanitized, count };
  }

  /**
   * Detect potential prompt injection or jailbreak attempts.
   */
  public static detectPromptInjection(text: string): { detected: boolean; flagged: string[] } {
    const flagged: string[] = [];

    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        flagged.push(pattern.toString());
      }
    }

    return {
      detected: flagged.length > 0,
      flagged,
    };
  }

  /**
   * Perform comprehensive safety filtering and sanitization.
   */
  public static inspectAndSanitize(rawInput: string): SafetyCheckResult {
    const { detected: injectionDetected, flagged: flaggedPatterns } = this.detectPromptInjection(rawInput);
    const { sanitized: redactedText, count: redactedPiiCount } = this.redactPII(rawInput);

    let sanitizedText = redactedText;
    if (injectionDetected) {
      sanitizedText = sanitizedText
        .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, '[DISALLOWED_PROMPT_INJECTION]')
        .replace(/system\s+prompt\s+override/gi, '[DISALLOWED_OVERRIDE]')
        .replace(/reveal\s+your\s+system\s+prompt/gi, '[DISALLOWED_LEAK_ATTEMPT]');

      for (const pattern of this.INJECTION_PATTERNS) {
        sanitizedText = sanitizedText.replace(pattern, '[DISALLOWED_PROMPT_INJECTION]');
      }
    }

    return {
      isSafe: !injectionDetected,
      sanitizedText,
      redactedPiiCount,
      injectionDetected,
      flaggedPatterns,
    };
  }

  /**
   * Sanitize document chunks before inclusion in RAG prompts to neutralize indirect prompt injection.
   */
  public static sanitizeDocumentContext(context: string): string {
    const { sanitizedText } = this.inspectAndSanitize(context);
    return sanitizedText
      .replace(/<\/?system>/gi, '')
      .replace(/<<SYS>>|<<\/SYS>>/gi, '')
      .replace(/\[INST\]|\[\/INST\]/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
  }
}

