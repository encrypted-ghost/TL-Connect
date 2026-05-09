import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  category: string;
  workspaceId: string;
  createdAt: any;
  updatedAt: any;
}

export class TemplateService {
  private static collectionName = 'templates';

  static async getTemplates(workspaceId: string): Promise<EmailTemplate[]> {
    const q = query(
      collection(db, this.collectionName),
      where('workspaceId', '==', workspaceId),
      where('isDeleted', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailTemplate));
  }

  static async getTemplate(id: string, workspaceId: string): Promise<EmailTemplate> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().workspaceId !== workspaceId) {
      throw new Error('Template not found');
    }
    return { id: docSnap.id, ...docSnap.data() } as EmailTemplate;
  }

  static async createTemplate(workspaceId: string, data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const docRef = await addDoc(collection(db, this.collectionName), {
      ...data,
      workspaceId,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: docRef.id, ...data } as EmailTemplate;
  }

  static async updateTemplate(id: string, workspaceId: string, data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    const updated = await this.getTemplate(id, workspaceId);
    return updated;
  }

  static async deleteTemplate(id: string, workspaceId: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, { isDeleted: true, updatedAt: serverTimestamp() });
  }

  static async seedDefaults(workspaceId: string) {
    const existing = await this.getTemplates(workspaceId);
    if (existing.length > 0) return;

    const defaults = [
      {
        name: 'Welcome Email',
        subject: 'Welcome to {{brand_name}}!',
        category: 'Onboarding',
        bodyHtml: `<h1>Hi {{first_name}}!</h1><p>We are thrilled to have you on board. {{brand_name}} is here to help you secure your legacy.</p><p>Best,<br>The Team</p>`
      },
      {
        name: 'Follow-up (Day 3)',
        subject: 'Quick question about your setup',
        category: 'Nurture',
        bodyHtml: `<p>Hi {{first_name}},</p><p>I noticed you haven't finished setting up your vault yet. Is there anything I can help with?</p><p>Best,<br>{{agent_name}}</p>`
      }
    ];

    for (const t of defaults) {
      await this.createTemplate(workspaceId, t);
    }
  }
}
