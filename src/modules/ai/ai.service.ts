export class AIService {
  private ai: any = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (apiKey) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { GoogleGenAI } = require('@google/genai');
        this.ai = new GoogleGenAI({ apiKey });
      } catch {
        // Optional package
      }
    }
  }

  async rewriteEmail(content: string, tone: 'professional' | 'friendly' | 'urgent' | 'casual' = 'professional') {
    if (!this.ai) {
      return content;
    }

    try {
      const prompt = `Rewrite the following email to be more ${tone}. Keep all placeholders like {{firstName}} intact: \n\n${content}`;
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || content;
    } catch (error) {
      console.error('AI Rewrite Error:', error);
      return content;
    }
  }

  async suggestSubjectLines(content: string) {
    if (!this.ai) return ['No AI subjects available'];

    try {
      const prompt = `Suggest 5 catchy and professional subject lines for the following email body: \n\n${content}\n\nFormat as a bulleted list.`;
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text?.split('\n').filter((line: string) => line.trim().length > 0) || [];
    } catch (error) {
      console.error('AI Subject Suggestion Error:', error);
      return [];
    }
  }
}

export const aiService = new AIService();
