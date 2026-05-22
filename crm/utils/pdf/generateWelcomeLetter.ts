import jsPDF from 'jspdf';

export const generateWelcomeLetter = async (data: any, type: string = 'client', preview: boolean = false) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Load SVG Letterhead
    try {
        const img = new Image();
        img.src = '/Letterhead.png'; // Ensure this image is in the public directory
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => {
                console.warn("Failed to load letterhead image");
                resolve(null); // Continue without it
            };
        });

        // Create a canvas to draw the SVG and convert to PNG
        const canvas = document.createElement('canvas');
        // Set canvas size matching A4 aspect ratio, scaled up for quality
        canvas.width = 1190;
        canvas.height = 1684;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            // Draw white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imgData = canvas.toDataURL('image/png');
            // Add image to PDF
            doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
        }

    } catch (e) {
        console.warn("Letterhead processing error", e);
    }

    // --- CONTENT ---
    let y = 55; // Start below letterhead
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Content Configuration based on Type
    const contentMap: any = {
        client: {
            body: (name: string) => `We are pleased to extend our warmest welcome to you as a valued member of the **Dholera Infra Development Pvt. Ltd. (DIDPL)** family.

Your investment in **Dholera Infra Development Pvt. Ltd.** reflects your confidence in our vision, commitment, and the future potential of **Dholera SIR**. We sincerely appreciate the trust you have placed in us and assure you that we remain fully dedicated to delivering transparency, quality, and long-term value at every step of your investment journey.

At DIDPL, we believe that every customer is not just an investor, but a partner in progress. We are confident that your association with us will lead to a future that is both healthy and wealthy, filled with growth, prosperity, and peace of mind.

Should you require any assistance, updates, or support, our team is always at your service.

Once again, welcome to the DIDPL family. We look forward to a strong and enduring relationship.`
        },
        investor: {
            body: (name: string) => `We are delighted to welcome you as a valued Investor with **Dholera Infra Development Pvt. Ltd. (DIDPL)**. Thank you for placing your trust and confidence in us. Your association is highly appreciated, and we look forward to a rewarding and transparent investment journey together.

DIDPL is committed to developing and promoting well-planned real estate opportunities in **Dholera SIR** - India's first Greenfield Smart City, supported by strong government vision, infrastructure development, and long-term growth potential. Our focus remains on delivering value-driven projects with clarity, compliance, and future appreciation.

As an investor, you will receive timely updates regarding your investment, project progress, and relevant developments. Our dedicated team is always available to assist you with information, documentation, and any support you may require.

We value long-term relationships built on trust, integrity, and performance, and we are confident that your association with DIDPL will be both secure and beneficial.

Once again, welcome to the DIDPL family. We look forward to growing together.`
        },
        consultant: {
            body: (name: string) => `We are pleased to welcome you as a Consultant with **Dholera Infra Development Pvt. Ltd. (DIDPL)**. We appreciate your decision to associate with us and look forward to a mutually beneficial professional relationship.

DIDPL is actively involved in the development and promotion of projects in **Dholera SIR** - India's first Greenfield Smart City. Your expertise, industry knowledge, and professional insights will add significant value to our operations and help us achieve our strategic objectives.

Your engagement as Consultant will be effective from ** [Start Date] **, as per the mutually agreed terms and conditions. During this association, we trust that you will uphold the highest standards of professionalism, confidentiality, and ethical conduct while representing DIDPL.

Our team will coordinate with you regarding scope of work, communication protocols, and other operational details. Should you require any assistance or clarification, please feel free to connect with your point of contact or the management team.

We look forward to a successful association and wish you every success in your role as our Consultant.`
        },
        employee: {
            body: (name: string) => `We are pleased to welcome you to **Dholera Infra Development Pvt. Ltd. (DIDPL)**. Congratulations on joining our team, and we are delighted to have you onboard.

At DIDPL, we are committed to building trust, transparency, and long-term value while contributing to the growth of **Dholera SIR** - India's first Greenfield Smart City. Your skills, experience, and enthusiasm will play an important role in helping us achieve our goals, and we believe you will be a valuable addition to our organization.

Your appointment as **[Designation]** will commence from **[Joining Date]**. We are confident that your contribution will help strengthen our team and support our vision of creating sustainable and future-ready developments.

Our team will assist you with the onboarding process and provide you with all necessary information regarding your role, responsibilities, and company policies. Should you have any questions or need support, please feel free to reach out to your reporting manager or the HR team at any time.

Once again, welcome to DIDPL. We look forward to a successful and rewarding association with you.`
        }
    };

    const selectedContent = contentMap[type] || contentMap.client;

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
    doc.text(`Dear ${data.name || data.client_name || 'Client'},`, margin, y);
    y += 10;

    // Body Text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    // Replace placeholders if any (like [Start Date] for consultants)
    let finalBody = selectedContent.body(data.name || data.client_name || 'Client');
    if (type === 'consultant') {
        const startDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        finalBody = finalBody.replace('[Start Date]', startDate);
    }
    if (type === 'employee') {
        const joiningDate = data.joining_date
            ? new Date(data.joining_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

        finalBody = finalBody.replace('[Designation]', data.designation || 'Team Member');
        finalBody = finalBody.replace('[Joining Date]', joiningDate);
    }

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
    doc.text("Dholera Infra Development Pvt. Ltd", margin, y);

    y += 6;

    // --- SAVE or RETURN for PREVIEW ---
    const fileName = `Welcome_Letter_${(data.name || data.client_name || 'Client').replace(/\s+/g, '_')}.pdf`;

    if (preview) {
        // Return doc and fileName for preview
        return { doc, fileName };
    } else {
        // Direct download
        doc.save(fileName);
        return { doc, fileName };
    }
};
