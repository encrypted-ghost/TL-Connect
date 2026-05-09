import { db } from '../../lib/supabase';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-at-least-32-chars-long');

export class AuthService {
  static async generateToken(user: any) {
    return new SignJWT({ 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      workspaceId: user.workspaceId 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1d')
      .sign(JWT_SECRET);
  }

  static async verifyToken(token: string) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return payload as { id: string, email: string, role: string, workspaceId: string };
    } catch (error) {
      return null;
    }
  }

  static async getCurrentUser(token: string) {
    const payload = await this.verifyToken(token);
    if (!payload) return null;

    const { data: user, error } = await db
      .from('User')
      .select('*, workspace:Workspace(*)')
      .eq('id', payload.id)
      .single();

    if (error) return null;
    return user;
  }

  static async bootstrap() {
    const { count } = await db.from('Workspace').select('*', { count: 'exact', head: true });
    
    if (count === 0) {
      const { data: workspace, error: wsError } = await db
        .from('Workspace')
        .insert([{ name: 'Transfer Legacy', slug: 'transfer-legacy' }])
        .select()
        .single();

      if (wsError) throw new Error(wsError.message);

      await db.from('User').insert([{
        email: 'admin@transferlegacy.com',
        name: 'System Admin',
        role: 'ADMIN',
        workspaceId: workspace.id,
      }]);
      
      console.log('✅ System Bootstrapped (Supabase)');
    }
  }
}
