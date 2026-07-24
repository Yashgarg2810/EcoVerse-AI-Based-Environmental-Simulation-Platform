const express = require('express');
const prisma = require('../prisma/db');
const { verifyToken } = require('../middleware/authMiddleware');
const { generateAuditReport } = require('../formulaEngine');

const router = express.Router();

// All audit routes require authentication
router.use(verifyToken);

// ─── POST /api/audit/save-draft ───────────────────────────────────────────────
// Upserts the user's audit draft in the database (one draft per user)
router.post('/save-draft', async (req, res) => {
  try {
    const { formData } = req.body;
    if (!formData) {
      return res.status(400).json({ error: 'formData is required.' });
    }

    const draft = await prisma.auditDraft.upsert({
      where: { userId: req.user.id },
      update: { formData },
      create: { userId: req.user.id, formData },
    });

    res.json({ success: true, message: 'Draft saved successfully.', draftId: draft.id });
  } catch (error) {
    console.error('[AUDIT] Save draft error:', error.message);
    res.status(500).json({ error: 'Failed to save draft.' });
  }
});

// ─── GET /api/audit/draft ─────────────────────────────────────────────────────
// Retrieves the current user's saved draft (if any)
router.get('/draft', async (req, res) => {
  try {
    const draft = await prisma.auditDraft.findUnique({
      where: { userId: req.user.id },
    });

    res.json({ success: true, draft: draft ? draft.formData : null });
  } catch (error) {
    console.error('[AUDIT] Get draft error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve draft.' });
  }
});

// ─── POST /api/audit/generate ─────────────────────────────────────────────────
// Generates an AI audit report via Groq, then persists it to the DB
router.post('/generate', async (req, res) => {
  try {
    const { formData } = req.body;
    if (!formData) {
      return res.status(400).json({ error: 'formData is required.' });
    }

    // Call Groq to generate the report
    const report = await generateAuditReport(formData);

    // Persist to database
    const savedReport = await prisma.auditReport.create({
      data: {
        userId: req.user.id,
        institution: formData.institution || 'Unknown Institution',
        campus: formData.campus || 'Main Campus',
        academicYear: formData.academicYear || '',
        formData: formData,        // JSONB
        reportData: JSON.stringify(report), // TEXT
        overallScore: report.overallScore || 0,
      },
    });

    // Delete draft after successful report generation
    await prisma.auditDraft.deleteMany({ where: { userId: req.user.id } });

    res.json({ success: true, report, reportId: savedReport.id });
  } catch (error) {
    console.error('[AUDIT] Generate report error (full):', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    res.status(500).json({ error: 'Failed to generate report. Please try again.' });
  }
});

// ─── GET /api/audit/reports ───────────────────────────────────────────────────
// Lists all audit reports for the current user (summary fields only)
router.get('/reports', async (req, res) => {
  try {
    const reports = await prisma.auditReport.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        institution: true,
        campus: true,
        academicYear: true,
        overallScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, reports });
  } catch (error) {
    console.error('[AUDIT] List reports error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve reports.' });
  }
});

// ─── GET /api/audit/reports/:id ──────────────────────────────────────────────
// Returns a full audit report (including AI-generated data) by ID
router.get('/reports/:id', async (req, res) => {
  try {
    const report = await prisma.auditReport.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id, // Ensures users can only access their own reports
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    // Parse the TEXT-stored report back to an object for the client
    const parsedReport = JSON.parse(report.reportData);

    res.json({
      success: true,
      report: {
        id: report.id,
        institution: report.institution,
        campus: report.campus,
        academicYear: report.academicYear,
        overallScore: report.overallScore,
        createdAt: report.createdAt,
        formData: report.formData,
        reportData: parsedReport,
      },
    });
  } catch (error) {
    console.error('[AUDIT] Get report error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve report.' });
  }
});

// ─── DELETE /api/audit/reports/:id ───────────────────────────────────────────
// Deletes an audit report (only the owner can delete)
router.delete('/reports/:id', async (req, res) => {
  try {
    const report = await prisma.auditReport.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    await prisma.auditReport.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Report deleted successfully.' });
  } catch (error) {
    console.error('[AUDIT] Delete report error:', error.message);
    res.status(500).json({ error: 'Failed to delete report.' });
  }
});

module.exports = router;
