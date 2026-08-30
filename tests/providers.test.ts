/**
 * TL-Connect Email Providers & Factory Test Suite
 */
// Set test environment variables before importing app configs
process.env.NODE_ENV = 'test';
process.env.APP_URL = 'http://localhost:3000';
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'mock-secret-key-for-test-suite';
process.env.SUPABASE_PUBLISHABLE_KEY = 'mock-pub-key-for-test-suite';
process.env.JWT_SECRET = 'super-secret-jwt-test-key-32-chars-long!';

import { EmailProviderFactory } from '../src/modules/email/email.factory';
import { BrevoEmailProvider } from '../src/modules/email/providers/brevo.impl';
import { ResendEmailProvider } from '../src/modules/email/providers/resend.impl';
import { SendGridEmailProvider } from '../src/modules/email/providers/sendgrid.impl';
import { PostmarkEmailProvider } from '../src/modules/email/providers/postmark.impl';
import { MailgunEmailProvider } from '../src/modules/email/providers/mailgun.impl';
import { SmtpEmailProvider } from '../src/modules/email/providers/smtp.impl';
import { MailjetEmailProvider } from '../src/modules/email/providers/mailjet.impl';
import { MockEmailProvider } from '../src/modules/email/providers/mock.impl';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, errorDetail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${errorDetail ? `(${errorDetail})` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('🧪 RUNNING TL-CONNECT MULTI-PROVIDER TESTS');
  console.log('========================================\n');

  // Test 1: Provider Factory Instantiations
  console.log('--- 1. EmailProviderFactory Instantiation ---');
  const brevo = EmailProviderFactory.createProvider('brevo', { apiKey: 'test-key' });
  assert(brevo instanceof BrevoEmailProvider, 'Factory creates BrevoEmailProvider');
  assert(brevo.name === 'brevo', 'Brevo provider has name "brevo"');

  const resend = EmailProviderFactory.createProvider('resend', { apiKey: 're_123' });
  assert(resend instanceof ResendEmailProvider, 'Factory creates ResendEmailProvider');
  assert(resend.name === 'resend', 'Resend provider has name "resend"');

  const sendgrid = EmailProviderFactory.createProvider('sendgrid', { apiKey: 'SG.123' });
  assert(sendgrid instanceof SendGridEmailProvider, 'Factory creates SendGridEmailProvider');
  assert(sendgrid.name === 'sendgrid', 'SendGrid provider has name "sendgrid"');

  const postmark = EmailProviderFactory.createProvider('postmark', { serverToken: 'pm_token' });
  assert(postmark instanceof PostmarkEmailProvider, 'Factory creates PostmarkEmailProvider');
  assert(postmark.name === 'postmark', 'Postmark provider has name "postmark"');

  const mailgun = EmailProviderFactory.createProvider('mailgun', { apiKey: 'mg_key', domain: 'mg.test.com' });
  assert(mailgun instanceof MailgunEmailProvider, 'Factory creates MailgunEmailProvider');
  assert(mailgun.name === 'mailgun', 'Mailgun provider has name "mailgun"');

  const smtp = EmailProviderFactory.createProvider('smtp', { host: 'mail.test.com', port: 587, user: 'u', pass: 'p' });
  assert(smtp instanceof SmtpEmailProvider, 'Factory creates SmtpEmailProvider');
  assert(smtp.name === 'smtp', 'SMTP provider has name "smtp"');

  const mailjet = EmailProviderFactory.createProvider('mailjet', { apiKey: 'mj_key', apiSecret: 'mj_secret' });
  assert(mailjet instanceof MailjetEmailProvider, 'Factory creates MailjetEmailProvider');
  assert(mailjet.name === 'mailjet', 'Mailjet provider has name "mailjet"');

  const unknown = EmailProviderFactory.createProvider('nonexistent');
  assert(unknown instanceof MockEmailProvider, 'Factory falls back to MockEmailProvider for unknown type');

  // Test 2: Missing Credentials Error Handling
  console.log('\n--- 2. Missing Credentials Handling ---');
  const emptyBrevo = new BrevoEmailProvider({ apiKey: '' });
  const brevoRes = await emptyBrevo.send({
    fromEmail: 'test@transferlegacy.com',
    fromName: 'Test',
    toEmail: 'lead@example.com',
    subject: 'Hello',
    html: '<p>Test</p>',
  });
  assert(!brevoRes.success, 'Brevo returns success: false when API key is missing');
  assert(brevoRes.error?.includes('Brevo API key is missing') || false, 'Brevo returns descriptive error message');

  const emptyResend = new ResendEmailProvider({ apiKey: '' });
  const resendRes = await emptyResend.send({
    fromEmail: 'test@transferlegacy.com',
    fromName: 'Test',
    toEmail: 'lead@example.com',
    subject: 'Hello',
    html: '<p>Test</p>',
  });
  assert(!resendRes.success, 'Resend returns success: false when API key is missing');

  const emptySmtp = new SmtpEmailProvider({ host: '', port: 587, user: '', pass: '' });
  const smtpRes = await emptySmtp.send({
    fromEmail: 'test@transferlegacy.com',
    fromName: 'Test',
    toEmail: 'lead@example.com',
    subject: 'Hello',
    html: '<p>Test</p>',
  });
  assert(!smtpRes.success, 'SMTP returns success: false when host/user credentials are missing');

  // Test 3: Mock Provider Test
  console.log('\n--- 3. Mock Provider Validation ---');
  const mock = new MockEmailProvider();
  const mockRes = await mock.send({
    fromEmail: 'test@transferlegacy.com',
    fromName: 'Test Sender',
    toEmail: 'lead@example.com',
    subject: 'Outreach Test',
    html: '<p>Hello from test suite</p>',
  });
  assert(mockRes.success, 'Mock provider successfully delivers email');
  assert(mockRes.messageId?.startsWith('mock-') || false, 'Mock provider generates valid mock message ID');

  // Test 4: Workspace Fallback Configuration
  console.log('\n--- 4. Workspace Config Resolution ---');
  const fallbackConfig = await EmailProviderFactory.getProviderForWorkspace('');
  assert(!!fallbackConfig.provider, 'Fallback provider is returned for empty workspace');
  assert(!!fallbackConfig.fromEmail, 'Fallback fromEmail is populated');
  assert(fallbackConfig.dailyLimit === 1000, 'Default daily limit is 1000');

  console.log('\n========================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
