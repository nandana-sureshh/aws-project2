/// <reference path="../types/pdf-parse.d.ts" />
import { prisma, createStorageProvider } from '@caresync/shared';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import pdf from 'pdf-parse';

export async function processDocumentSummary(documentId: string): Promise<void> {
  console.log(`[ai-service] Starting summary generation for document: ${documentId}`);

  try {
    // 1. Fetch document from the database
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      console.error(`[ai-service] Document ${documentId} not found in database.`);
      return;
    }

    // Idempotency: Skip if already completed
    if (document.aiSummaryStatus === 'COMPLETED') {
      console.log(`[ai-service] Document ${documentId} already summarized. Skipping.`);
      return;
    }

    // 2. Validate supported mime types
    const supportedMimeTypes = ['application/pdf', 'text/plain'];
    if (!supportedMimeTypes.includes(document.mimeType)) {
      console.log(`[ai-service] Unsupported mime type "${document.mimeType}" for document ${documentId}. Marking as FAILED.`);
      await prisma.document.update({
        where: { id: documentId },
        data: {
          aiSummaryStatus: 'FAILED',
          aiSummary: 'AI summary is only supported for PDF and text reports.'
        }
      });
      return;
    }

    // Update status to PROCESSING
    await prisma.document.update({
      where: { id: documentId },
      data: { aiSummaryStatus: 'PROCESSING' }
    });

    // 3. Download the file using the shared StorageProvider
    console.log(`[ai-service] Downloading file buffer for storage key: ${document.storageKey}`);
    const storageProvider = createStorageProvider();
    const buffer = await storageProvider.downloadFile(document.storageKey);

    // 4. Extract text based on file format
    let extractedText = '';
    if (document.mimeType === 'text/plain') {
      extractedText = buffer.toString('utf-8');
    } else if (document.mimeType === 'application/pdf') {
      console.log(`[ai-service] Parsing PDF buffer...`);
      const parsedPdf = await pdf(buffer);
      extractedText = parsedPdf.text;
    }

    extractedText = extractedText.trim();
    if (!extractedText) {
      console.warn(`[ai-service] Extracted text is empty for document ${documentId}. Marking as FAILED.`);
      await prisma.document.update({
        where: { id: documentId },
        data: {
          aiSummaryStatus: 'FAILED',
          aiSummary: 'Could not extract readable text from the document.'
        }
      });
      return;
    }

    // Limit text to ~10,000 characters to protect token boundaries
    const maxChars = 10000;
    if (extractedText.length > maxChars) {
      console.log(`[ai-service] Truncating extracted text from ${extractedText.length} to ${maxChars} characters.`);
      extractedText = extractedText.substring(0, maxChars) + '\n[... truncated for summary ...]';
    }

    // 5. Invoke AWS Bedrock (Amazon Nova Lite model)
    console.log(`[ai-service] Invoking AWS Bedrock model to summarize report...`);
    const region = process.env.AWS_REGION ?? 'us-east-1';
    const client = new BedrockRuntimeClient({ region });

    const modelId = process.env.BEDROCK_MODEL_ID ?? 'amazon.nova-lite-v1:0';

    const prompt = `You are a medical report summarizer helper.
Your goal is to extract key findings from the provided medical report and present them in a clear, human-readable summary.
The summary should be structured and easy to read.

CRITICAL INSTRUCTIONS:
1. DO NOT make any diagnoses.
2. DO NOT provide treatment recommendations or medication guidelines.
3. Keep the focus entirely on summarizing the document's contents.
4. Highlight important findings (e.g., lab values outside of normal reference ranges or highlighted abnormalities) in plain, clear language.
5. End the summary with this exact disclaimer: "DISCLAIMER: This is an AI-generated summary of your medical report for informational purposes only. It is not a diagnosis or treatment recommendation. Please consult your physician to discuss these findings."

Here is the medical report text:
---
${extractedText}
---`;

    const bedrockInput = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [{ text: prompt }]
          }
        ],
        inferenceConfig: {
          maxNewTokens: 1000,
          temperature: 0.1,
          topP: 0.9
        }
      })
    };

    const command = new InvokeModelCommand(bedrockInput);
    const response = await client.send(command);

    const responseBody = JSON.parse(new TextDecoder('utf-8').decode(response.body));
    const summaryText = responseBody.output.message.content[0].text;

    console.log(`[ai-service] Bedrock summary generated successfully for document ${documentId}.`);

    // 6. Save summary and update status
    await prisma.document.update({
      where: { id: documentId },
      data: {
        aiSummary: summaryText,
        aiSummaryStatus: 'COMPLETED'
      }
    });

  } catch (err: any) {
    console.error(`[ai-service] Summarization failed for document ${documentId}:`, err);
    
    // Save error message/state to DB so user receives feedback
    try {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          aiSummaryStatus: 'FAILED',
          aiSummary: `Failed to generate AI summary: ${err.message || 'Unknown error'}. Please verify Bedrock configuration and model access.`
        }
      });
    } catch (dbErr) {
      console.error('[ai-service] Failed to update document failure status in database:', dbErr);
    }
  }
}
