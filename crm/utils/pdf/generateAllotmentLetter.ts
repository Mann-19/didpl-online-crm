import jsPDF from 'jspdf';

export const generateAllotmentLetter = async (data: any, preview: boolean = false) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Load SVG Letterhead or Company Logo
    try {
        const isDefaultLogo = !data.company_logo;
        const logoSrc = data.company_logo || '/Letterhead.png';
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = logoSrc;
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve; // Continue without it on error
        });

        if (isDefaultLogo) {
            // Create a canvas to draw the SVG and convert to PNG
            const canvas = document.createElement('canvas');
            canvas.width = 1190;
            canvas.height = 1684;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const imgData = canvas.toDataURL('image/png');
                doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
            }
        } else {
            // Draw custom company logo at the top center
            const aspect = img.width / img.height || 1;
            const h = 30;
            const w = 30 * aspect;
            doc.addImage(img, 'PNG', pageWidth / 2 - (w / 2), 15, w, h);
        }

    } catch (e) {
        console.warn("Letterhead processing error", e);
    }

    // --- CONTENT ---
    let y = 55; // Start below letterhead
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    const companyName = data.company_display_name || data.company_name || 'Dholera Infra Development Pvt. Ltd. (DIDPL)';
    const companyShortName = data.company_name || 'DIDPL';

    const bodyText = `We are pleased to inform you that your unit/plot has been successfully allotted under the project of **${companyName}**.

The details of your allotment are as follows:

**Project Name:** ${data.project_name || data.project?.name || 'N/A'}
**Plot/Unit No.:** ${data.plot_number || data.plot?.plot_number || 'N/A'}
**Size:** ${data.area_sqyd || data.plot?.area_sqyd || 'N/A'} sq.yd
**Location:** Dholera SIR

We sincerely thank you for your trust and association with ${companyShortName}. We assure you of our continued commitment towards transparency, quality, and customer satisfaction.

For any assistance or further information, please feel free to contact us.

We look forward to a long and valuable relationship with you.`;

    // Date & Address Section
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");

    const todayStr = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
    });

    // Calculate position for right alignment
    const dateText = `Date: ${todayStr}`;
    const dateWidth = doc.getTextWidth(dateText);
    const rightMargin = pageWidth - margin;
    doc.text(dateText, rightMargin - dateWidth, y);
    y += 6;

    // To section
    // To section — show both names if partnership
    const recipientName = data.partner_name
      ? `${data.name || data.client_name || 'Client'} & ${data.partner_name}`
      : (data.name || data.client_name || 'Client');
    doc.text(`Dear ${recipientName},`, margin, y);
    y += 10;

    // Body Text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const finalBody = bodyText;

    // Helper to render text with bold markers (**text**) and full justification
    const renderStyledText = (text: string, x: number, initialY: number, maxWidth: number, lineHeight: number) => {
        let currentY = initialY;
        const spaceWidth = doc.getTextWidth(' ');

        // Split by newlines to handle paragraphs
        const paragraphs = text.split('\n');

        paragraphs.forEach((paragraph) => {
            if (!paragraph.trim()) {
                currentY += lineHeight;
                return;
            }

            // Build a flat list of tokens with style information
            const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
            const tokens: any[] = [];

            parts.forEach(part => {
                const isBold = part.startsWith('**') && part.endsWith('**');
                const content = isBold ? part.slice(2, -2) : part;
                // Split content into words preserving non-empty
                const words = content.split(' ').filter(w => w !== '');
                words.forEach((w) => tokens.push({ text: w, bold: isBold }));
            });

            // Build lines (each line is array of token objects)
            const lines: any[][] = [];
            let line: any[] = [];
            let lineWidth = 0;

            const measureToken = (token: any) => {
                doc.setFont('helvetica', token.bold ? 'bold' : 'normal');
                return doc.getTextWidth(token.text);
            };

            tokens.forEach((token) => {
                const tokenWidth = measureToken(token);
                const additionalSpace = line.length > 0 ? spaceWidth : 0;

                if (lineWidth + additionalSpace + tokenWidth <= maxWidth) {
                    line.push({ ...token, width: tokenWidth });
                    lineWidth += additionalSpace + tokenWidth;
                } else {
                    // push existing line and start new one
                    if (line.length > 0) {
                        lines.push(line);
                    }
                    line = [{ ...token, width: tokenWidth }];
                    lineWidth = tokenWidth;
                }
            });

            if (line.length > 0) lines.push(line);

            // Render each line with justification except the last line of paragraph
            lines.forEach((ln, lineIndex) => {
                const isLastLine = lineIndex === lines.length - 1;
                // Sum widths
                const wordsTotalWidth = ln.reduce((s: number, t: any) => s + t.width, 0);
                const gaps = Math.max(ln.length - 1, 0);

                if (!isLastLine && gaps > 0) {
                    // Distribute extra space across gaps (include normal space width)
                    const totalNormalSpace = spaceWidth * gaps;
                    const extraSpace = (maxWidth - (wordsTotalWidth + totalNormalSpace)) / gaps;
                    let currentX = x;

                    ln.forEach((token: any, i: number) => {
                        doc.setFont('helvetica', token.bold ? 'bold' : 'normal');
                        doc.text(token.text, currentX, currentY);
                        currentX += token.width;
                        if (i < ln.length - 1) {
                            currentX += spaceWidth + extraSpace;
                        }
                    });
                } else {
                    // Left align (last line or single word)
                    let currentX = x;
                    ln.forEach((token: any) => {
                        doc.setFont('helvetica', token.bold ? 'bold' : 'normal');
                        doc.text(token.text, currentX, currentY);
                        currentX += token.width + spaceWidth;
                    });
                }

                currentY += lineHeight;
            });

            // Add a blank line after paragraph
            currentY += 0;
        });

        return currentY;
    };

    // Render the styled text
    const lineHeight = 5;
    y = renderStyledText(finalBody, margin, y, contentWidth, lineHeight);

    // Add some extra padding after the body
    y += 5;

    // Closing
    doc.text("Warm regards,", margin, y);
    y += 25; // Space for signature

    // Footer / Signatory
    doc.setFont("helvetica", "bold");
    doc.text("Authorized", margin, y);
    y += 6;
    doc.text(companyName, margin, y);

    y += 6;

    // --- SAVE or RETURN for PREVIEW ---
    const baseName = data.partner_name
      ? `${(data.name || data.client_name || 'Client').replace(/\s+/g, '_')}_and_${data.partner_name.replace(/\s+/g, '_')}`
      : (data.name || data.client_name || 'Client').replace(/\s+/g, '_');
    const fileName = `Allotment_Letter_${baseName}.pdf`;

    if (preview) {
        // Return doc and fileName for preview
        return { doc, fileName };
    } else {
        // Direct download
        doc.save(fileName);
        return { doc, fileName };
    }
};
