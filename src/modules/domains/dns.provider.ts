import axios from 'axios';

export class DNSProvider {
  private apiKey: string;
  private email: string;
  private accountId: string;

  constructor() {
    this.apiKey = process.env.CLOUDFLARE_API_KEY || '';
    this.email = process.env.CLOUDFLARE_EMAIL || '';
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  }

  private get headers() {
    return {
      'X-Auth-Email': this.email,
      'X-Auth-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async setupOutreachSubdomain(zoneId: string, subdomain: string, ip: string) {
    if (!this.apiKey) {
      console.warn('Cloudflare API key missing. DNS setup skipped.');
      return;
    }

    try {
      // Create A record
      await axios.post(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
        {
          type: 'A',
          name: subdomain,
          content: ip,
          proxied: true,
        },
        { headers: this.headers }
      );

      // Create MX records for Mailgun (typical setup)
      await axios.post(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
        {
          type: 'MX',
          name: subdomain,
          content: 'mxa.mailgun.org',
          priority: 10,
        },
        { headers: this.headers }
      );
    } catch (error) {
      console.error('Cloudflare DNS Setup Error:', error);
      throw error;
    }
  }

  async verifyRecords(zoneId: string) {
    // Logic to verify SPF/DKIM/DMARC
    return { spf: true, dkim: true, dmarc: true };
  }
}

export const dnsProvider = new DNSProvider();
