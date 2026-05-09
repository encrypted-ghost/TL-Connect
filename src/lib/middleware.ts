import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from './supabaseAdmin';
import { decodeJwt } from 'jose';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';

/**
 * Supabase Auth Middleware
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ error: 'Unauthorized: Invalid token string' });
    }

    // 1. Verify token with Supabase
    let sbUser: any = null;
    let authError: any = null;

    try {
      // Primary method: getUser verification
      // We use the supabaseAdmin client but we want to ensure it doesn't 
      // trigger internal "session missing" errors which can happen in some Node environments.
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error) {
        // If we get a "session missing" or similar library error, we attempt fallback
        if (error.message?.includes('session missing')) {
          const decoded = decodeJwt(token);
          if (decoded?.sub) {
            const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.getUserById(decoded.sub as string);
            if (adminData?.user && !adminError) {
              sbUser = adminData.user;
            } else {
              authError = adminError || new Error('Fallback failed');
            }
          }
        } else {
          authError = error;
        }
      } else {
        sbUser = data?.user;
      }
    } catch (e: any) {
      // Catch-all for unexpected library failures
      const decoded = decodeJwt(token);
      if (decoded?.sub) {
        const { data: adminData } = await supabaseAdmin.auth.admin.getUserById(decoded.sub as string);
        if (adminData?.user) {
          sbUser = adminData.user;
        } else {
          authError = e;
        }
      } else {
        authError = e;
      }
    }

    if (!sbUser) {
      console.error('[AuthMiddleware] Auth failed:', authError?.message || 'No user found');
      return res.status(401).json({ 
        error: 'Unauthorized: Invalid session', 
        details: authError?.message || 'Verification failed.' 
      });
    }

    // 2. Fetch RBAC profile from Supabase DB
    const refinedEmail = (sbUser.email || '').toLowerCase().trim();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, workspace_id')
      .eq('email', refinedEmail)
      .maybeSingle();

    if (profileError) {
      console.error('[AuthMiddleware] Profile fetch error:', profileError.message || profileError);
      console.error('[AuthMiddleware] Profile fetch error details:', JSON.stringify(profileError, null, 2));
    }

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@transferlegacy.com').toLowerCase().trim();
    const isSuperAdmin = refinedEmail === adminEmail;

    if (!userProfile && !isSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden: No authorized profile found.' });
    }

    // 3. Attach to request
    const userRole = isSuperAdmin ? 'SUPER_ADMIN' : ((userProfile as any)?.role || 'VIEWER');
    const workspaceId = (userProfile as any)?.workspace_id || 'default-workspace-id';

    req.user = {
      id: userProfile?.id || sbUser.id,
      email: sbUser.email || '',
      role: userRole,
      workspaceId: workspaceId
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Unauthorized: Auth processing failed' });
  }
}

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
