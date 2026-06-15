// src/utils/certificateEngine.js
import { jsPDF } from 'jspdf';

export const generateCertificate = (currentUser, readinessScore) => {
  // A4 Landscape
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Dark Cyber Background
  doc.setFillColor(15, 23, 42); // bg-slate-900
  doc.rect(0, 0, width, height, 'F');

  // Outer Border
  doc.setDrawColor(6, 182, 212); // reeCyan
  doc.setLineWidth(2);
  doc.rect(10, 10, width - 20, height - 20, 'S');

  // Inner Border (Dashed)
  doc.setDrawColor(139, 92, 246); // reePurple
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([5, 5], 0);
  doc.rect(15, 15, width - 30, height - 30, 'S');
  doc.setLineDashPattern([], 0); // reset

  // Header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICATE OF OPERATIONAL READINESS', width / 2, 50, { align: 'center' });

  // Subtitle
  doc.setTextColor(148, 163, 184); // muted
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('THIS SECURE DOCUMENT VERIFIES THAT', width / 2, 70, { align: 'center' });

  // User Name
  doc.setTextColor(6, 182, 212); // reeCyan
  doc.setFontSize(48);
  doc.setFont('helvetica', 'bold');
  const agentName = currentUser?.displayName || 'Authorized Agent';
  doc.text(agentName.toUpperCase(), width / 2, 100, { align: 'center' });

  // Achievement Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  const text1 = `Has successfully surpassed the minimum passing threshold within the REE.ai Core`;
  const text2 = `Pressure Chamber, achieving an authorized Board Readiness Index of ${readinessScore}%.`;
  doc.text(text1, width / 2, 120, { align: 'center' });
  doc.text(text2, width / 2, 130, { align: 'center' });

  // Footer Details
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`ISSUED: ${issueDate}`, 30, height - 30);
  doc.text(`UID: ${currentUser?.uid || 'AWAITING-UPLINK'}`, width - 30, height - 30, { align: 'right' });
  
  // Seal / Stamp
  doc.setDrawColor(6, 182, 212);
  doc.setLineWidth(1);
  doc.circle(width / 2, height - 40, 15, 'S');
  doc.setTextColor(6, 182, 212);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('VERIFIED', width / 2, height - 39, { align: 'center' });

  doc.save(`REE_Readiness_Certificate_${agentName.replace(/\s+/g, '_')}.pdf`);
};