import { db } from '../../lib/supabase';

export class QueueService {
  private static isProcessing = false;

  /**
   * Add a job to the queue using Supabase
   */
  static async enqueue(type: string, payload: any, priority = 0) {
    const { data, error } = await db
      .from('QueueJob')
      .insert([{ 
        type, 
        payload, 
        priority, 
        status: 'PENDING',
        runAt: new Date().toISOString()
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
      const { data: job, error: fetchError } = await db
        .from('QueueJob')
        .select('*')
        .eq('status', 'PENDING')
        .lte('runAt', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('createdAt', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!job || fetchError) {
        this.isProcessing = false;
        return;
      }

      // Mark as processing
      await db.from('QueueJob').update({ status: 'PROCESSING' }).eq('id', job.id);

      // In production, execute the job here (e.g. email sending)
      
      // Mark as completed
      await db.from('QueueJob').update({ status: 'COMPLETED' }).eq('id', job.id);

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
    }, 5000);
  }
}
