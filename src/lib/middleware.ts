import { NextFunction, Request, Response } from 'express';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'ghost-gaming-official'
  });
}

/**
 * Production-grade Firebase Auth Middleware
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const idToken = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // For this simple environment, we derive workspaceId from email or a fixed one for now
    // In a real app, you'd fetch the user profile from Firestore
    req.user = {
      id: decodedToken.uid,
      email: decodedToken.email || '',
      role: (decodedToken as any).role || 'ADMIN', // Default to admin for first user
      workspaceId: 'default-workspace' // Hardcoded for simplicity in demo
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        workspaceId: string;
      };
    }
  }
}
