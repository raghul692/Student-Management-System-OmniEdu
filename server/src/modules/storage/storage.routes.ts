import { Router, Request, Response } from 'express';
import fs from 'fs';
import { storageService, LocalSignedStorageProvider } from '../../services/storage/storage.service';

const router = Router();

router.get('/stream', (req: Request, res: Response) => {
  const key = req.query.key as string;
  const expires = parseInt(req.query.expires as string, 10);
  const sig = req.query.sig as string;

  if (!key || isNaN(expires) || !sig) {
    return res.status(400).json({ status: 'fail', message: 'Missing required signed URL parameters' });
  }

  const provider = storageService.getProvider();
  if (provider instanceof LocalSignedStorageProvider) {
    const isValid = provider.verifySignedToken(key, expires, sig);
    if (!isValid) {
      return res.status(403).json({ status: 'fail', message: 'Invalid or expired file signature' });
    }

    const filePath = provider.getFilePath(key);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: 'fail', message: 'File not found' });
    }

    res.sendFile(filePath);
  } else {
    res.status(501).json({ status: 'fail', message: 'Signed streaming not supported for this provider' });
  }
});

export default router;
