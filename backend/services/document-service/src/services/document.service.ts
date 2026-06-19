import {
  prisma,
  AppError,
  StorageProvider,
  NotificationProvider,
  parsePagination,
  createAuditLog,
  createQueueProvider,
} from '@caresync/shared';

export async function uploadDocument(
  userId: string,
  file: Express.Multer.File,
  body: { appointmentId?: string; medicalRecordId?: string },
  storageProvider: StorageProvider,
  notificationProvider: NotificationProvider
) {
  const uploaded = await storageProvider.uploadFile(
    file.buffer,
    file.originalname,
    file.mimetype,
    'documents'
  );

  return confirmUpload(userId, {
    key: uploaded.key,
    filename: uploaded.filename,
    originalName: uploaded.originalName,
    mimeType: uploaded.mimeType,
    size: uploaded.size,
    appointmentId: body.appointmentId,
    medicalRecordId: body.medicalRecordId
  }, notificationProvider);
}

export async function generateUploadUrl(
  originalName: string,
  mimeType: string,
  storageProvider: StorageProvider
) {
  return storageProvider.getUploadUrl(originalName, mimeType, 'documents');
}

export async function confirmUpload(
  userId: string,
  body: {
    key: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    appointmentId?: string;
    medicalRecordId?: string;
  },
  notificationProvider: NotificationProvider
) {
  const document = await prisma.document.create({
    data: {
      userId,
      appointmentId: body.appointmentId ?? null,
      medicalRecordId: body.medicalRecordId ?? null,
      filename: body.filename,
      originalName: body.originalName,
      mimeType: body.mimeType,
      size: body.size,
      storageKey: body.key,
    },
  });

  await notificationProvider.send({
    userId,
    type: 'DOCUMENT_UPLOADED',
    title: 'Document Uploaded',
    message: `Document "${body.originalName}" has been uploaded successfully.`,
  });

  await createAuditLog({
    userId,
    action: 'UPLOAD',
    resource: 'documents',
    resourceId: document.id,
    details: { filename: body.originalName, size: body.size },
  });

  // Trigger AI summarization queue dispatch
  const queueProvider = createQueueProvider();
  if (document.mimeType === 'application/pdf' || document.mimeType === 'text/plain') {
    queueProvider.enqueue('ai-summary', { documentId: document.id }).catch((err) => {
      console.error('[document-service] Failed to enqueue AI summarization task:', err);
    });
  } else {
    // Unsupported formats are marked FAILED immediately with a message
    await prisma.document.update({
      where: { id: document.id },
      data: {
        aiSummaryStatus: 'FAILED',
        aiSummary: 'AI summary is only supported for PDF and text reports.',
      },
    }).catch((err) => {
      console.error('[document-service] Failed to update unsupported document summary status:', err);
    });
  }

  return { ...document, url: `/api/documents/${body.filename}/download` };
}


export async function downloadDocument(
  documentId: string,
  userId: string,
  role: string,
  storageProvider: StorageProvider
): Promise<{ buffer: Buffer; document: { mimeType: string; originalName: string } }> {
  const document = await prisma.document.findUnique({ where: { id: documentId } });

  if (!document) {
    throw new AppError('Document not found', 404, 'Not Found');
  }

  if (role === 'PATIENT' && document.userId !== userId) {
    throw new AppError('Access denied', 403, 'Forbidden');
  }

  const buffer = await storageProvider.downloadFile(document.storageKey);

  return { buffer, document: { mimeType: document.mimeType, originalName: document.originalName } };
}

export async function deleteDocument(
  documentId: string,
  userId: string,
  role: string,
  storageProvider: StorageProvider
) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });

  if (!document) {
    throw new AppError('Document not found', 404, 'Not Found');
  }

  if (role !== 'ADMIN' && document.userId !== userId) {
    throw new AppError('Access denied', 403, 'Forbidden');
  }

  await storageProvider.deleteFile(document.storageKey);
  await prisma.document.delete({ where: { id: documentId } });

  await createAuditLog({
    userId,
    action: 'DELETE',
    resource: 'documents',
    resourceId: documentId,
  });
}

export async function getUserDocuments(userId: string, query: { page?: string; limit?: string }) {
  const { page, limit } = parsePagination(query);
  const skip = (page - 1) * limit;

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.document.count({ where: { userId } }),
  ]);

  return {
    data: documents,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getDocumentUrl(
  documentId: string,
  storageProvider: StorageProvider
): Promise<string> {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) {
    throw new AppError('Document not found', 404, 'Not Found');
  }
  return storageProvider.getFileUrl(document.storageKey);
}
