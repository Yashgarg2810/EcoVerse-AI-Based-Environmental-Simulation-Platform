const express = require('express');
const prisma = require('../prisma/db');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// All campus/assets routes require authentication
router.use(verifyToken);

// Middleware to ensure req.user.campusId is resolved and self-healed if absent
async function ensureCampusId(req, res, next) {
  try {
    let campusId = req.user.campusId;
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (dbUser) {
      if (dbUser.campusId) {
        campusId = dbUser.campusId;
      } else {
        // Self-heal: link user to first existing campus or create a default one
        let campus = await prisma.campus.findFirst();
        if (!campus) {
          campus = await prisma.campus.create({
            data: {
              name: 'COER University',
              address: 'Roorkee, Uttarakhand, India',
              latitude: 29.8918,
              longitude: 77.9601,
              totalArea: 120,
              numBuildings: 15
            }
          });
        }
        await prisma.user.update({
          where: { id: req.user.id },
          data: { campusId: campus.id }
        });
        campusId = campus.id;
        console.log(`[Self-Healing] Linked user ${dbUser.email} to campus ${campus.name}`);
      }
    }
    req.user.campusId = campusId;
  } catch (err) {
    console.error('[CAMPUS] DB campusId query/self-heal failed:', err.message);
  }
  next();
}

router.use(ensureCampusId);

// ─── GET /api/campus/profile ──────────────────────────────────────────────────
// Returns the institution/campus metadata for the current user
router.get('/profile', async (req, res) => {
  try {
    if (!req.user.campusId) {
      return res.status(404).json({ error: 'No campus associated with this user.' });
    }

    const campus = await prisma.campus.findUnique({
      where: { id: req.user.campusId }
    });

    if (!campus) {
      return res.status(404).json({ error: 'Campus profile not found.' });
    }

    res.json({ success: true, campus });
  } catch (error) {
    console.error('[CAMPUS] Get profile error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve campus profile.' });
  }
});

// ─── GET /api/campus/list ─────────────────────────────────────────────────────
// Returns list of all registered campuses (id, name, coordinates)
router.get('/list', async (req, res) => {
  try {
    const campuses = await prisma.campus.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, campuses });
  } catch (error) {
    console.error('[CAMPUS] Get list error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve campus list.' });
  }
});

// ─── GET /api/campus/assets ────────────────────────────────────────────────────
// Returns all assets deployed in the institution's campus
router.get('/assets', async (req, res) => {
  try {
    if (!req.user.campusId) {
      return res.status(400).json({ error: 'User does not belong to a campus.' });
    }

    const assets = await prisma.campusAsset.findMany({
      where: { campusId: req.user.campusId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, assets });
  } catch (error) {
    console.error('[CAMPUS] Get assets error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve campus assets.' });
  }
});

// ─── POST /api/campus/assets ───────────────────────────────────────────────────
// Creates a new sustainability asset (plantation, solar, waste, water)
router.post('/assets', async (req, res) => {
  try {
    const { name, category, latitude, longitude, details } = req.body;

    if (!req.user.campusId) {
      return res.status(400).json({ error: 'User does not belong to a campus.' });
    }

    if (!name || !category || latitude === undefined || longitude === undefined || !details) {
      return res.status(400).json({ error: 'Name, category, coordinates, and details are required.' });
    }

    // Verify coordinates are numbers
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Invalid coordinates provided.' });
    }

    // Create the asset
    const asset = await prisma.campusAsset.create({
      data: {
        campusId: req.user.campusId,
        name,
        category,
        latitude: lat,
        longitude: lng,
        details // JSON object
      }
    });

    res.status(201).json({ success: true, asset });
  } catch (error) {
    console.error('[CAMPUS] Create asset error:', error.message);
    res.status(500).json({ error: 'Failed to deploy asset on map.' });
  }
});

// ─── DELETE /api/campus/assets/:id ─────────────────────────────────────────────
// Deletes a sustainability asset
router.delete('/assets/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user.campusId) {
      return res.status(400).json({ error: 'User does not belong to a campus.' });
    }

    // Find asset first to ensure ownership
    const asset = await prisma.campusAsset.findUnique({
      where: { id }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    if (asset.campusId !== req.user.campusId) {
      return res.status(403).json({ error: 'Access denied. You do not own this asset.' });
    }

    await prisma.campusAsset.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Asset removed successfully.' });
  } catch (error) {
    console.error('[CAMPUS] Delete asset error:', error.message);
    res.status(500).json({ error: 'Failed to delete asset.' });
  }
});

module.exports = router;
