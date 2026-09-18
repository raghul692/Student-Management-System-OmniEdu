import { prisma } from '../../../config/prisma';
import { getAIProvider } from '../providers/aiProvider.factory';
import { AiVisibility } from '@prisma/client';

export interface SearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  chunkIndex: number;
  content: string;
  similarityScore: number;
}

export class VectorSearchService {
  /**
   * Cosine similarity between two numerical vectors.
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length || a.length !== b.length) return 0.0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0.0 : dot / denom;
  }

  /**
   * Search knowledge chunks within tenant institution context using hybrid ranking.
   */
  public static async search(
    query: string,
    institutionId: string,
    options: {
      limit?: number;
      minScore?: number;
      visibilityFilter?: AiVisibility[];
    } = {}
  ): Promise<SearchResult[]> {
    const limit = options.limit || 5;
    const minScore = options.minScore || 0.25;

    // 1. Generate query embedding vector
    const provider = getAIProvider();
    const queryEmbedding = await provider.generateEmbedding(query);

    // 2. Fetch candidates from database strictly scoped to institution
    const chunks = await prisma.aiKnowledgeChunk.findMany({
      where: {
        document: {
          institutionId,
          ...(options.visibilityFilter ? { visibility: { in: options.visibilityFilter } } : {}),
        },
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            documentType: true,
            institutionId: true,
          },
        },
      },
      take: 100,
    });

    if (chunks.length === 0) {
      return [];
    }

    // 3. Compute vector similarity and keyword relevance for each candidate
    const queryTokens = query.toLowerCase().match(/\b\w+\b/g) || [];
    const scoredList: SearchResult[] = [];

    for (const chunk of chunks) {
      let vectorScore = 0.0;
      if (chunk.embedding) {
        try {
          const chunkVector: number[] = JSON.parse(chunk.embedding);
          vectorScore = this.cosineSimilarity(queryEmbedding, chunkVector);
        } catch {
          vectorScore = 0.0;
        }
      }

      // Keyword term frequency matching
      const contentLower = chunk.content.toLowerCase();
      let matches = 0;
      for (const token of queryTokens) {
        if (contentLower.includes(token)) {
          matches++;
        }
      }
      const textScore = queryTokens.length > 0 ? matches / queryTokens.length : 0.0;

      // Hybrid combination
      const hybridScore = Number((0.65 * vectorScore + 0.35 * textScore).toFixed(4));

      if (hybridScore >= minScore) {
        scoredList.push({
          chunkId: chunk.id,
          documentId: chunk.document.id,
          documentTitle: chunk.document.title,
          documentType: chunk.document.documentType,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          similarityScore: hybridScore,
        });
      }
    }

    // 4. Sort descending by score and slice to limit
    scoredList.sort((a, b) => b.similarityScore - a.similarityScore);
    return scoredList.slice(0, limit);
  }
}
