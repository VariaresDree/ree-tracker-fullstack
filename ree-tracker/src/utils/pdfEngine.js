// src/utils/pdfEngine.js
// jsPDF + html2canvas (~800KB combined) are dynamically imported so this heavy
// export path only loads when a user generates/exports a PDF.

export const generateDiagnosticReport = async (user, stats) => {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'), import('html2canvas'),
    ]);
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let cursorY = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138); 
    doc.text("REE.ai Board Readiness Report", pageWidth / 2, cursorY, { align: 'center' });
    
    cursorY += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); 
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated for: ${user?.displayName || user?.email || 'Reviewer'} | Date: ${dateStr}`, pageWidth / 2, cursorY, { align: 'center' });

    cursorY += 20;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Cognitive Telemetry Summary", 20, cursorY);
    
    cursorY += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`IRT Theta (Ability Level): ${stats?.irt?.theta?.toFixed(3) || '0.000'}`, 20, cursorY);
    cursorY += 7;
    doc.text(`Global Target Quota Streak: ${stats?.globalStreak || 0} Days`, 20, cursorY);
    
    cursorY += 15;

    const captureAndEmbed = async (elementId, title) => {
        const element = document.getElementById(elementId);
        if (!element) return false;

        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#0f172a' });
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(title, 20, cursorY);
            cursorY += 5;

            const imgWidth = pageWidth - 40; 
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (cursorY + imgHeight > 280) {
                doc.addPage();
                cursorY = 20;
            }

            doc.addImage(imgData, 'JPEG', 20, cursorY, imgWidth, imgHeight);
            cursorY += imgHeight + 15;
            return true;
        } catch (error) {
            console.error(`Failed to capture ${elementId}`, error);
            return false;
        }
    };

    await captureAndEmbed('heatmap-chart', 'Topic Mastery Heatmap');
    await captureAndEmbed('velocity-chart', '30-Day Theta Velocity Trajectory');

    if (cursorY > 250) { doc.addPage(); cursorY = 20; }
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38); 
    doc.text("Critical Vulnerabilities & Time Sinks", 20, cursorY);
    
    cursorY += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);

    const blindSpots = stats?.blindSpots || [];
    if (blindSpots.length === 0) {
        doc.text("No severe blind spots detected in the current matrix.", 20, cursorY);
    } else {
        doc.text(`Identified ${blindSpots.length} items in the Bleeding Edge queue requiring immediate review.`, 20, cursorY);
    }

    doc.save(`REE_Diagnostic_Report_${dateStr.replace(/ /g, '_')}.pdf`);
};


// ============================================================================
// OFFLINE BOARD EXAM EXPORT ENGINE (AUTHENTIC PRC COMPRESSED LAYOUT)
// ============================================================================
export const generateOfflineExamPDF = async (questions, configTitle) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let cursorY = 15;

    // CRITICAL FIX: Systematic WinAnsi Text Formatter
    // Converts unstable Unicode and LaTeX into highly readable, wrapping-safe text
    const cleanLatex = (str) => {
        if (!str) return '';
        
        // 1. Strip invisible/breaking unicode characters
        let s = str.replace(/[\u200B-\u200D\uFEFF]/g, '');
        s = s.replace(/\u00A0/g, ' '); 

        // 2. Strip structural LaTeX delimiters
        s = s.replace(/\$\$/g, '').replace(/\$/g, ''); 
        s = s.replace(/\\text{([^}]+)}/g, ' $1 '); 
        s = s.replace(/\\mathrm{([^}]+)}/g, ' $1 ');
        s = s.replace(/\\mathbf{([^}]+)}/g, ' $1 ');
        s = s.replace(/\\mathit{([^}]+)}/g, ' $1 ');
        s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')'); 
        s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']'); 
        s = s.replace(/\\left/g, '').replace(/\\right/g, ''); 
        
        s = s.replace(/\\frac{([^{}]+)}{([^{}]+)}/g, '($1)/($2)'); 
        s = s.replace(/\\sqrt{([^{}]+)}/g, 'sqrt($1)'); // Swapped to text to prevent glyph breaking
        
        // 3. Universal Dictionary mapping complex Unicode to jsPDF safe equivalents
        const symbols = {
            '\\times': 'x', '\\cdot': '*', '\\pi': 'pi', '\\theta': 'theta', '\\mu': 'micro', '\\Omega': 'ohms', 
            '\\infty': 'infinity', '\\int': 'Integral of ', '\\sum': 'Sum of ', '\\Delta': 'Delta', '\\alpha': 'alpha', 
            '\\beta': 'beta', '\\gamma': 'gamma', '\\rho': 'rho', '\\sigma': 'sigma', '\\varepsilon': 'epsilon', 
            '\\neq': '!=', '\\geq': '>=', '\\leq': '<=', '\\to': '->', '\\approx': '~', '\\circ': '°', 
            '\\angle': 'Angle ', '\\pm': '±', '\\mp': '∓'
        };
        for (const [tex, uni] of Object.entries(symbols)) { s = s.split(tex).join(uni); }
        
        s = s.replace(/\^2/g, '²').replace(/\^3/g, '³').replace(/\^circ/g, '°');
        s = s.replace(/\^{([^}]+)}/g, '^($1)').replace(/_{([^}]+)}/g, '_$1');
        
        // 4. Final Cleanup
        s = s.replace(/[{}]/g, ''); 
        s = s.replace(/\\/g, ''); 
        
        // 5. Wrap safety: Ensure spaces around equals signs and commas so jsPDF can break long equations
        s = s.replace(/,/g, ', ');
        s = s.replace(/\s*([=≈±])\s*/g, ' $1 ');

        // Compress double spaces
        s = s.replace(/\s+/g, ' ').trim(); 
        return s;
    };

    // Authentic PRC Questionnaire Header Layout
    const addHeader = (subjectSet) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("REGISTERED ELECTRICAL ENGINEER Pre-board Examination", 15, cursorY);
        cursorY += 5;
        
        const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        doc.text(`${dateStr}`, 15, cursorY);
        
        // CRITICAL FIX: Explicit Time Limits for EE vs Others
        const isEE = subjectSet.toUpperCase().includes('EE') || subjectSet.toUpperCase().includes('ELECTRICAL');
        const timeLimit = isEE ? "8:00 a.m. - 2:00 p.m." : "8:00 a.m. - 12:00 p.m.";
        doc.text(timeLimit, pageWidth - 15, cursorY, { align: 'right' });
        cursorY += 2;
        
        doc.setLineWidth(0.3);
        doc.line(15, cursorY, pageWidth - 15, cursorY); 
        cursorY += 5;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(subjectSet.toUpperCase(), 15, cursorY);
        doc.text("SET A", pageWidth - 15, cursorY, { align: 'right' });
        cursorY += 2;
        
        doc.line(15, cursorY, pageWidth - 15, cursorY); 
        cursorY += 6;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const instructions = "INSTRUCTION: Select the correct answer for each of the following questions. Mark only the answer for each item by shading the box corresponding to the letter of your choice on the answer sheet provided. STRICTLY NO ERASURES ALLOWED. Use pencil no. 2 only. Please do not write anything on this questionnaire.";
        const splitInst = doc.splitTextToSize(instructions, pageWidth - 30);
        doc.text(splitInst, 15, cursorY);
        cursorY += (splitInst.length * 4) + 4;
        
        doc.setFont("helvetica", "bold");
        doc.text("MULTIPLE CHOICE", 15, cursorY);
        cursorY += 5;
    };

    addHeader(configTitle);
    doc.setFontSize(9.5); // Slightly larger for optimal readability

    // Render Questions (Strict 2-Column PRC Layout with Overflow Protection)
    questions.forEach((q, idx) => {
        const qNum = `${idx + 1}. `;
        const qTextLines = doc.splitTextToSize(`${qNum}${cleanLatex(q.text)}`, pageWidth - 30);
        
        // Dynamic Height Calculation multiplier adjusted for 9.5 font
        let blockHeight = qTextLines.length * 4.5;
        let optLinesA = [], optLinesB = [], optLinesC = [], optLinesD = [];
        let row1Height = 0, row2Height = 0;

        if (q.options && q.options.length >= 4) {
            optLinesA = doc.splitTextToSize(`A. ${cleanLatex(q.options[0])}`, 85);
            optLinesB = doc.splitTextToSize(`B. ${cleanLatex(q.options[1])}`, 85);
            optLinesC = doc.splitTextToSize(`C. ${cleanLatex(q.options[2])}`, 85);
            optLinesD = doc.splitTextToSize(`D. ${cleanLatex(q.options[3])}`, 85);

            row1Height = Math.max(optLinesA.length, optLinesC.length) * 4.5;
            row2Height = Math.max(optLinesB.length, optLinesD.length) * 4.5;
            blockHeight += row1Height + row2Height + 2; 
        }

        // Trigger Page Break if the entire block won't fit
        if (cursorY + blockHeight > pageHeight - 15) { 
            doc.addPage(); 
            cursorY = 15; 
        }
        
        doc.setFont("helvetica", "normal");
        doc.text(qTextLines, 15, cursorY);
        cursorY += (qTextLines.length * 4.5); 

        // Draw 2-Column Options
        if (q.options && q.options.length >= 4) {
            const col1X = 22; const col2X = 112; // Perfect visual alignment

            // Row 1
            doc.text(optLinesA, col1X, cursorY);
            doc.text(optLinesC, col2X, cursorY);
            cursorY += row1Height;

            // Row 2
            doc.text(optLinesB, col1X, cursorY);
            doc.text(optLinesD, col2X, cursorY);
            cursorY += row2Height + 4; // Buffer between items
        } else { 
            cursorY += 4; 
        }
    });

    // ==========================================
    // BUBBLE SHEET PAGE (LANDSCAPE)
    // ==========================================
    doc.addPage('a4', 'landscape');
    const lWidth = doc.internal.pageSize.getWidth();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("EXAMINEE ANSWER SHEET", lWidth / 2, 15, { align: 'center' });
    
    // Header Info Boxes
    doc.setLineWidth(0.4);
    doc.rect(10, 20, lWidth - 20, 20); 
    doc.line(10, 30, lWidth - 10, 30); 

    doc.setFontSize(10);
    doc.text("NAME (USE BLACK BALLPEN) :", 12, 26);
    doc.line(70, 26, lWidth - 15, 26); 
    doc.text("SUBJECT :", 12, 36);
    doc.line(35, 36, lWidth - 15, 36); 

    // Left Panel
    doc.rect(10, 43, 45, 18);
    doc.setFontSize(9);
    doc.text("TEST QUESTION SET BOX", 12, 48);
    doc.text("SET    [ A ]     [ B ]", 15, 57);

    doc.rect(10, 64, 45, 110);
    doc.setFillColor(30, 58, 138); 
    doc.rect(10, 64, 45, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("Examinee ID Number", 32.5, 71, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // Right Panel: 4 Boxed Columns of 25 Items
    const startX = 60;
    const colWidth = 54;
    const gap = 3;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    let currentItem = 1;
    for (let c = 0; c < 4; c++) {
        let cx = startX + c * (colWidth + gap);
        doc.rect(cx, 43, colWidth, 160); 
        
        let cy = 49;
        for (let r = 0; r < 25; r++) {
            if (currentItem > 100) break;
            
            doc.setFont("helvetica", "bold");
            doc.text(currentItem.toString().padStart(2, ' '), cx + 4, cy);
            doc.setFont("helvetica", "normal");
            
            doc.text("[A]   [B]   [C]   [D]", cx + 14, cy); 
            cy += 6.2; 
            currentItem++;
        }
    }

    // ==========================================
    // SECURE ANSWER KEY PAGE (PORTRAIT)
    // ==========================================
    doc.addPage('a4', 'portrait');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SECURE ANSWER KEY", pageWidth / 2, 20, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(15, 25, pageWidth - 15, 25);
    
    doc.setFontSize(11);
    const akX = [25, 70, 115, 160];
    let akItem = 1;
    
    for (let c = 0; c < 4; c++) {
        let yPos = 35;
        for (let r = 0; r < 25; r++) {
            if (akItem > questions.length) break;
            const q = questions[akItem - 1];
            const correctLetter = q.options && q.answer ? String.fromCharCode(65 + q.options.indexOf(q.answer)) : '?';
            
            doc.setFont("helvetica", "bold");
            doc.text(`${akItem}.`, akX[c], yPos);
            doc.setFont("helvetica", "normal");
            doc.text(correctLetter, akX[c] + 10, yPos);
            
            yPos += 9.5; 
            akItem++;
        }
    }

    doc.save(`REE_Offline_Exam_${new Date().getTime()}.pdf`);
};