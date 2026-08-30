import { dispatchEmailWorkflow } from './email.workflow';
import { runCampaignWorkflow } from './campaign.workflow';

export const inngestFunctions = [dispatchEmailWorkflow, runCampaignWorkflow];
export { inngest } from '../../lib/inngest.client';
