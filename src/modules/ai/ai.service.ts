import { GoogleGenAI } from '@google/genai';

export class AIService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  async rewriteEmail(content: string, tone: 'professional' | 'friendly' | 'urgent' | 'casual' = 'professional') {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('Gemini API key missing. AI features disabled.');
      return content;
    }

    try {
      const prompt = `Rewrite the following email to be more ${tone}. Keep all placeholders like {{firstName}} intact: \n\n${content}`;
      
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text || content;
    } catch (error) {
      console.error('AI Rewrite Error:', error);
      return content;
    }
  }

  async suggestSubjectLines(content: string) {
    if (!process.env.GEMINI_API_KEY) return ['No AI subjects available'];

    try {
      const prompt = `Suggest 5 catchy and professional subject lines for the following email body: \n\n${content}\n\nFormat as a bulleted list.`;
      
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text?.split('\n').filter(line => line.trim().length > 0) || [];
    } catch (error) {
      console.error('AI Subject Suggestion Error:', error);
      return [];
    }
  }
}

export const aiService = new AIService();
