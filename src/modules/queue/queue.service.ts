import { supabaseAdmin } from '../../lib/supabaseAdmin.ts';
import { EmailProviderFactory } from '../email/email.factory.ts';

export class QueueService {
  private static isProcessing = false;

  /**
   * Add a job to the queue using Supabase
   */
  static async enqueue(type: string, payload: any, priority = 0) {
    const { data, error } = await supabaseAdmin
      .from('queue_jobs')
      .insert([{ 
        type, 
        payload, 
        priority, 
        status: 'PENDING',
        run_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Process pending jobs with Supabase
   */
  static async processNext() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const { data: job, error: fetchError } = await supabaseAdmin
        .from('queue_jobs')
        .select('*')
        .eq('status', 'PENDING')
        .lte('run_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!job || fetchError) {
        this.isProcessing = false;
        return;
      }

      // Mark as processing
      await supabaseAdmin.from('queue_jobs').update({ status: 'PROCESSING' }).eq('id', job.id);

      let success = true;
      let lastError = null;

      if (job.type === 'SEND_EMAIL') {
        try {
          const provider = EmailProviderFactory.getProvider();
          const result = await provider.send(job.payload as any);
          success = result.success;
          lastError = result.error;
        } catch (err: any) {
          success = false;
          lastError = err.message;
        }
      }
      
      if (success) {
        // Mark as completed
        await supabaseAdmin.from('queue_jobs').update({ 
          status: 'COMPLETED',
          updated_at: new Date().toISOString()
        }).eq('id', job.id);
      } else {
        const newRetryCount = (job.retry_count || 0) + 1;
        const maxRetries = 3;
        const status = newRetryCount >= maxRetries ? 'FAILED' : 'PENDING';
        
        await supabaseAdmin.from('queue_jobs').update({ 
          status,
          retry_count: newRetryCount,
          last_error: lastError,
          // Exponential backoff
          run_at: new Date(Date.now() + Math.pow(2, newRetryCount) * 5000).toISOString()
        }).eq('id', job.id);
      }

    } catch (error: any) {
      console.error('Queue Processing Error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start the worker loop
   */
  static startWorker() {
    setInterval(async () => {
      await this.processNext();
    }, 15000); // 15 seconds to avoid excessive rates
  }
}
