/**
 * Fast Standalone Multi-Provider Unit Tests
 */
import { BrevoEmailProvider } from '../src/modules/email/providers/brevo.impl.ts';
import { ResendEmailProvider } from '../src/modules/email/providers/resend.impl.ts';
import { SendGridEmailProvider } from '../src/modules/email/providers/sendgrid.impl.ts';
import { PostmarkEmailProvider } from '../src/modules/email/providers/postmark.impl.ts';
import { MailgunEmailProvider } from '../src/modules/email/providers/mailgun.impl.ts';
import { SmtpEmailProvider } from '../src/modules/email/providers/smtp.impl.ts';
import { MailjetEmailProvider } from '../src/modules/email/providers/mailjet.impl.ts';
import { MockEmailProvider } from '../src/modules/email/providers/mock.impl.ts';
import { EmailProviderFactory } from '../src/modules/email/email.factory.ts';

let passed = 0;
let failed = 0;

function assert(condition, name, detail) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function testAll() {
  console.log('\n=============================================');
  console.log('🧪 TL-CONNECT EMAIL PROVIDER UNIT TEST SUITE');
  console.log('=============================================\n');

  // Test 1: Factory Factory Method
  console.log('--- 1. Factory Creation Tests ---');
  const brevo = EmailProviderFactory.createProvider('brevo', { apiKey: 'test-brevo-key' });
  assert(brevo.name === 'brevo', 'Brevo instantiated correctly');

  const resend = EmailProviderFactory.createProvider('resend', { apiKey: 're_test' });
  assert(resend.name === 'resend', 'Resend instantiated correctly');

  const sendgrid = EmailProviderFactory.createProvider('sendgrid', { apiKey: 'SG.test' });
  assert(sendgrid.name === 'sendgrid', 'SendGrid instantiated correctly');

  const postmark = EmailProviderFactory.createProvider('postmark', { serverToken: 'test-pm' });
  assert(postmark.name === 'postmark', 'Postmark instantiated correctly');

  const mailgun = EmailProviderFactory.createProvider('mailgun', { apiKey: 'key-123', domain: 'mg.domain.com' });
  assert(mailgun.name === 'mailgun', 'Mailgun instantiated correctly');

  const smtp = EmailProviderFactory.createProvider('smtp', { host: 'mail.server.com', port: 587, user: 'u', pass: 'p' });
  assert(smtp.name === 'smtp', 'SMTP instantiated correctly');

  const mailjet = EmailProviderFactory.createProvider('mailjet', { apiKey: 'key', apiSecret: 'secret' });
  assert(mailjet.name === 'mailjet', 'Mailjet instantiated correctly');

  const fallback = EmailProviderFactory.createProvider('unknown-provider');
  assert(fallback.name === 'mock', 'Unknown provider falls back to mock');

  // Test 2: Missing API Key Validations
  console.log('\n--- 2. Credentials Validation Tests ---');
  const emptyBrevo = new BrevoEmailProvider({ apiKey: '' });
  const brevoRes = await emptyBrevo.send({
    fromEmail: 'outreach@transferlegacy.com',
    fromName: 'Transfer Legacy',
    toEmail: 'test@example.com',
    subject: 'Test',
    html: '<p>Test</p>'
  });
  assert(brevoRes.success === false, 'Brevo fails safely on missing API key');
  assert(brevoRes.error.includes('Brevo API key is missing'), 'Brevo returns clear error message');

  const emptyResend = new ResendEmailProvider({ apiKey: '' });
  const resendRes = await emptyResend.send({
    fromEmail: 'outreach@transferlegacy.com',
    fromName: 'Transfer Legacy',
    toEmail: 'test@example.com',
    subject: 'Test',
    html: '<p>Test</p>'
  });
  assert(resendRes.success === false, 'Resend fails safely on missing API key');

  const emptySmtp = new SmtpEmailProvider({ host: '', port: 587, user: '', pass: '' });
  const smtpRes = await emptySmtp.send({
    fromEmail: 'outreach@transferlegacy.com',
    fromName: 'Transfer Legacy',
    toEmail: 'test@example.com',
    subject: 'Test',
    html: '<p>Test</p>'
  });
  assert(smtpRes.success === false, 'SMTP fails safely on missing host/user');

  // Test 3: Mock Dispatcher Test
  console.log('\n--- 3. Mock Dispatcher Execution ---');
  const mock = new MockEmailProvider();
  const mockRes = await mock.send({
    fromEmail: 'outreach@transferlegacy.com',
    fromName: 'Transfer Legacy',
    toEmail: 'test@example.com',
    subject: 'Welcome to TL Connect',
    html: '<h1>Welcome</h1>'
  });
  assert(mockRes.success === true, 'Mock provider dispatches successfully');
  assert(mockRes.messageId.startsWith('mock-'), 'Mock generates valid mock Message-ID');

  // Test 4: Workspace Resolution Fallback
  console.log('\n--- 4. Workspace Provider Resolution ---');
  const config = await EmailProviderFactory.getProviderForWorkspace('');
  assert(Boolean(config.provider), 'Workspace config resolves default provider');
  assert(config.dailyLimit === 1000, 'Daily limit defaults to 1000');

  console.log('\n=============================================');
  console.log(`📊 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================\n');

  if (failed > 0) process.exit(1);
}

testAll().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
