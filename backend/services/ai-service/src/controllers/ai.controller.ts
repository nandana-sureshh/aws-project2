import { Request, Response, NextFunction } from 'express';
import * as aiService from '../services/ai.service';

export function handleSummarize(req: Request, res: Response, next: NextFunction): void {
  try {
    const { documentId } = req.body;
    if (!documentId) {
      res.status(400).json({ error: 'Bad Request', message: 'No documentId provided', statusCode: 400 });
      return;
    }

    console.log(`[ai-service] Webhook trigger received for document ID: ${documentId}. Processing asynchronously...`);

    // Respond 202 Accepted immediately to simulate an asynchronous queue handoff
    res.status(202).json({ message: 'Job accepted for processing', documentId });

    // Run the summarization task in the background
    aiService.processDocumentSummary(documentId).catch((err) => {
      console.error(`[ai-service] Error processing document summary for ${documentId}:`, err);
    });
  } catch (err) {
    next(err);
  }
}
