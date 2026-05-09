import React, { useState } from 'react';
import { useAuth } from '@/src/lib/AuthContext';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { toast } from 'sonner';
import { ShieldCheck, Lock, Activity, Eye, EyeOff } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email.toLowerCase().trim(), password.trim());
      toast.success('Access Granted. Session established.');
    } catch (error: any) {
      let message = error.message || 'Authentication failed. Check your security key.';
      
      // Provide developer-friendly hints if it's the generic error
      if (message === 'Invalid login credentials') {
        message = 'Invalid credentials. If this is the admin account, ensure your ADMIN_PASSWORD matches exactly. Check the server logs for sync status.';
      }
      
      toast.error(message, {
        duration: 5000,
      });
      console.error('Login error detail:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-4 font-sans selection:bg-indigo-500/30">
      <div className="w-full max-w-[420px] space-y-8">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-20 h-20 rounded-2xl bg-[#09090b] flex items-center justify-center p-1">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain animate-in zoom-in duration-500" />
            </div>
            <div className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 border-2 border-[#09090b]"></span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">TL Connect</h1>
            <p className="text-neutral-500 text-sm font-medium tracking-wide">ENTERPRISE SECURE OUTREACH PANEL</p>
          </div>
        </div>

        <div className="bg-[#111114] border border-[#27272a] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="text-indigo-500" size={80} />
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-widest text-neutral-500 font-bold">Terminal ID (Email)</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@transferlegacy.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-neutral-950 border-neutral-800 focus:ring-indigo-500 h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-widest text-neutral-500 font-bold">Security Key</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-neutral-950 border-neutral-800 focus:ring-indigo-500 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-white text-black hover:bg-neutral-200 transition-all font-bold h-11" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  AUTHENTICATING...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock size={16} /> UNLOCK SYSTEM
                </span>
              )}
            </Button>
          </form>
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-center text-[10px] text-neutral-600 uppercase tracking-[0.2em] font-black">
            System Status: Nominal | Encrypted Connection Active
          </p>
          <div className="flex gap-2">
            <div className="h-1 w-8 rounded-full bg-indigo-500/20"></div>
            <div className="h-1 w-8 rounded-full bg-indigo-500/50"></div>
            <div className="h-1 w-8 rounded-full bg-indigo-500/20"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
