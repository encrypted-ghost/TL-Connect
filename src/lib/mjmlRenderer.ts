/**
 * Zero-dependency, browser-safe MJML to responsive HTML renderer.
 * Converts MJML blueprints to email-compliant responsive HTML tables and inline styles
 * without bringing in server-side dependencies like cheerio or webpack shims.
 */

export interface MjmlRenderResult {
  html: string;
  errors: string[];
}

export function renderMjmlToHtml(mjmlCode: string): MjmlRenderResult {
  if (!mjmlCode || !mjmlCode.trim()) {
    return { html: '', errors: [] };
  }

  const errors: string[] = [];

  try {
    // Check if code contains MJML
    if (!mjmlCode.includes('<mjml>')) {
      return { html: mjmlCode, errors: [] };
    }

    // Extract body background color
    const bodyBgMatch = mjmlCode.match(/<mj-body[^>]*background-color=["']([^"']+)["']/i);
    const bodyBg = bodyBgMatch ? bodyBgMatch[1] : '#f8fafc';

    // Extract font family from mj-attributes/mj-all if available
    const fontMatch = mjmlCode.match(/font-family=["']([^"']+)["']/i);
    const fontFamily = fontMatch
      ? fontMatch[1]
      : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

    // Extract body content between <mj-body...> and </mj-body>
    const bodyMatch = mjmlCode.match(/<mj-body[^>]*>([\s\S]*?)<\/mj-body>/i);
    let bodyContent = bodyMatch ? bodyMatch[1] : mjmlCode;

    // Helper: Parse XML/HTML tag attributes into a key-value map
    const parseAttrs = (tagStr: string): Record<string, string> => {
      const attrs: Record<string, string> = {};
      const attrRegex = /([a-zA-Z0-9_-]+)=["']([^"']*)["']/g;
      let m: RegExpExecArray | null;
      while ((m = attrRegex.exec(tagStr)) !== null) {
        attrs[m[1].toLowerCase()] = m[2];
      }
      return attrs;
    };

    // Transform <mj-section>
    bodyContent = bodyContent.replace(/<mj-section([^>]*)>([\s\S]*?)<\/mj-section>/gi, (_, attrStr, inner) => {
      const attrs = parseAttrs(attrStr);
      const bg = attrs['background-color'] || 'transparent';
      const padding = attrs['padding'] || '20px 0';
      const radius = attrs['border-radius'] || '0px';
      const border = attrs['border'] || 'none';

      return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bg}; border-radius: ${radius}; border: ${border}; margin: 0 auto; max-width: 600px;">
          <tr>
            <td style="padding: ${padding}; font-family: ${fontFamily};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  ${inner}
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
    });

    // Transform <mj-column>
    bodyContent = bodyContent.replace(/<mj-column([^>]*)>([\s\S]*?)<\/mj-column>/gi, (_, attrStr, inner) => {
      const attrs = parseAttrs(attrStr);
      const width = attrs['width'] || '100%';
      const padding = attrs['padding'] || '0';

      return `
        <td width="${width}" valign="top" style="padding: ${padding}; font-family: ${fontFamily};">
          ${inner}
        </td>
      `;
    });

    // Transform <mj-text>
    bodyContent = bodyContent.replace(/<mj-text([^>]*)>([\s\S]*?)<\/mj-text>/gi, (_, attrStr, inner) => {
      const attrs = parseAttrs(attrStr);
      const color = attrs['color'] || '#334155';
      const fontSize = attrs['font-size'] || '15px';
      const fontWeight = attrs['font-weight'] || 'normal';
      const lineHeight = attrs['line-height'] || '1.6';
      const align = attrs['align'] || 'left';
      const padding = attrs['padding'] || '10px 0';
      const paddingTop = attrs['padding-top'] ? `padding-top: ${attrs['padding-top']};` : '';
      const paddingBottom = attrs['padding-bottom'] ? `padding-bottom: ${attrs['padding-bottom']};` : '';

      return `
        <div style="color: ${color}; font-size: ${fontSize}; font-weight: ${fontWeight}; line-height: ${lineHeight}; text-align: ${align}; padding: ${padding}; ${paddingTop} ${paddingBottom} font-family: ${fontFamily};">
          ${inner.trim()}
        </div>
      `;
    });

    // Transform <mj-button>
    bodyContent = bodyContent.replace(/<mj-button([^>]*)>([\s\S]*?)<\/mj-button>/gi, (_, attrStr, inner) => {
      const attrs = parseAttrs(attrStr);
      const bg = attrs['background-color'] || '#4f46e5';
      const color = attrs['color'] || '#ffffff';
      const href = attrs['href'] || '#';
      const radius = attrs['border-radius'] || '6px';
      const fontWeight = attrs['font-weight'] || '600';
      const align = attrs['align'] || 'left';
      const padding = attrs['padding'] || '16px 0';

      return `
        <div style="text-align: ${align}; padding: ${padding};">
          <a href="${href}" target="_blank" style="display: inline-block; background-color: ${bg}; color: ${color}; font-family: ${fontFamily}; font-size: 15px; font-weight: ${fontWeight}; text-decoration: none; padding: 12px 24px; border-radius: ${radius}; text-align: center;">
            ${inner.trim()}
          </a>
        </div>
      `;
    });

    // Transform <mj-divider>
    bodyContent = bodyContent.replace(/<mj-divider([^>]*)(\/>|><\/mj-divider>)/gi, (_, attrStr) => {
      const attrs = parseAttrs(attrStr);
      const borderColor = attrs['border-color'] || '#e2e8f0';
      const borderWidth = attrs['border-width'] || '1px';
      const borderStyle = attrs['border-style'] || 'solid';
      const padding = attrs['padding'] || '15px 0';

      return `
        <div style="padding: ${padding};">
          <hr style="border: none; border-top: ${borderWidth} ${borderStyle} ${borderColor}; margin: 0;" />
        </div>
      `;
    });

    // Transform <mj-image>
    bodyContent = bodyContent.replace(/<mj-image([^>]*)(\/>|><\/mj-image>)/gi, (_, attrStr) => {
      const attrs = parseAttrs(attrStr);
      const src = attrs['src'] || '';
      const alt = attrs['alt'] || '';
      const width = attrs['width'] || '100%';
      const align = attrs['align'] || 'center';
      const href = attrs['href'];

      const imgHtml = `<img src="${src}" alt="${alt}" width="${width}" style="max-width: 100%; height: auto; display: block; margin: ${align === 'center' ? '0 auto' : '0'}; border: 0;" />`;
      if (href) {
        return `<div style="text-align: ${align}; padding: 10px 0;"><a href="${href}" target="_blank">${imgHtml}</a></div>`;
      }
      return `<div style="text-align: ${align}; padding: 10px 0;">${imgHtml}</div>`;
    });

    // Transform <mj-spacer>
    bodyContent = bodyContent.replace(/<mj-spacer([^>]*)(\/>|><\/mj-spacer>)/gi, (_, attrStr) => {
      const attrs = parseAttrs(attrStr);
      const height = attrs['height'] || '20px';
      return `<div style="height: ${height}; line-height: ${height}; font-size: 1px;">&nbsp;</div>`;
    });

    // Wrap in standard responsive HTML email boilerplate
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: ${bodyBg}; font-family: ${fontFamily}; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    a { color: inherit; }
  </style>
</head>
<body style="margin: 0; padding: 20px 10px; background-color: ${bodyBg}; font-family: ${fontFamily};">
  <center>
    ${bodyContent}
  </center>
</body>
</html>`;

    return { html: fullHtml, errors: [] };
  } catch (err: any) {
    errors.push(err.message || 'Unknown render error');
    return {
      html: `<div style="color: #ef4444; padding: 20px; font-family: monospace;">Render Error: ${err.message}</div>`,
      errors
    };
  }
}
