import { prisma } from '../../../config/prisma';
import { getAIProvider } from '../providers/aiProvider.factory';
import { AiDocumentType, AiVisibility } from '@prisma/client';
import { AppError } from '../../../middleware/errorHandler';
import { SafetyFilter } from '../safety/safetyFilter';
import { logger } from '../../../config/logger';

export interface IngestDocumentParams {
  organizationId: string;
  institutionId: string;
  title: string;
  content: string;
  documentType?: AiDocumentType;
  academicYear?: string;
  visibility?: AiVisibility;
  uploadedBy?: string;
  fileUrl?: string;
}

export class DocumentIngestionService {
  /**
   * Split document into overlapping text chunks (approx 600 tokens ~ 2400 chars, 100 token overlap ~ 400 chars).
   */
  public static chunkText(text: string, chunkSize = 2000, chunkOverlap = 400): string[] {
    const cleanText = text.replace(/\r\n/g, '\n').trim();
    if (cleanText.length <= chunkSize) {
      return [cleanText];
    }

    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < cleanText.length) {
      let endIndex = startIndex + chunkSize;

      // Try to break on paragraph or sentence boundary if possible
      if (endIndex < cleanText.length) {
        const nextBreak = cleanText.lastIndexOf('\n\n', endIndex);
        if (nextBreak > startIndex + chunkSize / 2) {
          endIndex = nextBreak;
        } else {
          const sentenceBreak = cleanText.lastIndexOf('. ', endIndex);
          if (sentenceBreak > startIndex + chunkSize / 2) {
            endIndex = sentenceBreak + 1;
          }
        }
      }

      const chunk = cleanText.slice(startIndex, endIndex).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      startIndex = endIndex - chunkOverlap;
      if (startIndex >= cleanText.length || startIndex < 0) break;
    }

    return chunks;
  }

  /**
   * Ingest and index an institutional document with vector embeddings.
   */
  public static async ingestDocument(params: IngestDocumentParams) {
    if (!params.content || params.content.trim().length === 0) {
      throw new AppError('Document content cannot be empty', 400);
    }

    // Safety check: sanitize and redact PII from ingested institutional docs
    const { sanitizedText } = SafetyFilter.inspectAndSanitize(params.content);
    const provider = getAIProvider();

    // 1. Chunk text
    const chunks = this.chunkText(sanitizedText);
    logger.info({ title: params.title, totalChunks: chunks.length }, 'Chunking document for RAG');

    let normalizedDocType: AiDocumentType = AiDocumentType.OTHER;
    if (params.documentType) {
      const dt = String(params.documentType).toUpperCase();
      if (dt in AiDocumentType) {
        normalizedDocType = dt as AiDocumentType;
      } else if (dt.includes('REGULATION') || dt.includes('ACADEMIC')) {
        normalizedDocType = AiDocumentType.REGULATION;
      } else if (dt.includes('POLICY')) {
        normalizedDocType = AiDocumentType.POLICY;
      } else if (dt.includes('SYLLABUS')) {
        normalizedDocType = AiDocumentType.SYLLABUS;
      } else if (dt.includes('EXAM')) {
        normalizedDocType = AiDocumentType.EXAM_RULES;
      } else if (dt.includes('FEE')) {
        normalizedDocType = AiDocumentType.FEE_POLICY;
      } else if (dt.includes('ATTENDANCE')) {
        normalizedDocType = AiDocumentType.ATTENDANCE_POLICY;
      } else if (dt.includes('CIRCULAR')) {
        normalizedDocType = AiDocumentType.CIRCULAR;
      }
    }

    let normalizedVisibility: AiVisibility = AiVisibility.ALL;
    if (params.visibility) {
      const vis = String(params.visibility).toUpperCase();
      if (vis in AiVisibility) {
        normalizedVisibility = vis as AiVisibility;
      } else if (vis.includes('CAMPUS') || vis.includes('WIDE') || vis.includes('ALL')) {
        normalizedVisibility = AiVisibility.ALL;
      } else if (vis.includes('FACULTY')) {
        normalizedVisibility = AiVisibility.FACULTY_ONLY;
      } else if (vis.includes('ADMIN')) {
        normalizedVisibility = AiVisibility.ADMIN_ONLY;
      } else if (vis.includes('PARENT') || vis.includes('STUDENT')) {
        normalizedVisibility = AiVisibility.PARENTS_AND_STUDENTS;
      }
    }

    // 2. Create parent Document record in PostgreSQL
    const doc = await prisma.aiKnowledgeDocument.create({
      data: {
        organizationId: params.organizationId,
        institutionId: params.institutionId,
        title: params.title,
        documentType: normalizedDocType,
        academicYear: params.academicYear,
        visibility: normalizedVisibility,
        uploadedBy: params.uploadedBy || 'system',
        fileUrl: params.fileUrl,
        summary: chunks[0].slice(0, 300) + '...',
        totalChunks: chunks.length,
      },
    });

    // 3. Generate embeddings and persist chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      let embeddingVector: number[] = [];
      try {
        embeddingVector = await provider.generateEmbedding(chunkText);
      } catch (err) {
        logger.warn({ chunkIndex: i }, 'Falling back to default vector hash for chunk');
      }

      await prisma.aiKnowledgeChunk.create({
        data: {
          documentId: doc.id,
          chunkIndex: i,
          content: chunkText,
          tokenCount: Math.ceil(chunkText.length / 4),
          embedding: JSON.stringify(embeddingVector),
          metadata: {
            title: params.title,
            documentType: doc.documentType,
            chunkIndex: i,
            totalChunks: chunks.length,
          },
        },
      });
    }

    return {
      ...doc,
      chunkCount: chunks.length,
    };
  }
}
