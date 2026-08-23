import { dispatchEmailWorkflow } from './email.workflow.ts';
import { runCampaignWorkflow } from './campaign.workflow.ts';

export const inngestFunctions = [dispatchEmailWorkflow, runCampaignWorkflow];
export { inngest } from '../../lib/inngest.client.ts';
