const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db');

const router = express.Router();

/**
 * Helper: sign a JWT for a user
 * @param {object} user - Prisma User record
 * @param {boolean} rememberMe - whether to use a 30-day expiry
 */
function signToken(user, rememberMe = false) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, campusId: user.campusId },
    process.env.JWT_SECRET,
    { expiresIn: rememberMe ? '30d' : '1d' }
  );
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
// Body: { name, email, password, role, collegeName, address, latitude, longitude, totalArea, numBuildings, numStudents }
router.post('/register', async (req, res) => {
  try {
    const {
      name, email, password, role,
      collegeName, address, latitude, longitude, totalArea, numBuildings, numStudents
    } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Validate required campus fields
    if (!collegeName || !address || latitude === undefined || longitude === undefined || totalArea === undefined || numBuildings === undefined) {
      return res.status(400).json({ error: 'All institution details (Name, Address, Coordinates, Area, Buildings) are required.' });
    }

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create campus and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const campus = await tx.campus.create({
        data: {
          name: collegeName,
          address,
          latitude: parseFloat(latitude) || 0,
          longitude: parseFloat(longitude) || 0,
          totalArea: parseFloat(totalArea) || 0,
          numBuildings: parseInt(numBuildings) || 0,
          numStudents: numStudents ? parseInt(numStudents) : null
        }
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: role || 'researcher',
          campusId: campus.id,
        },
      });

      return { user, campus };
    });

    const token = signToken(result.user);

    res.status(201).json({
      success: true,
      token,
      user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role, campusId: result.user.campusId },
    });
  } catch (error) {
    console.error('[AUTH] Register error:', error.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Body: { email, password, rememberMe? }
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user, rememberMe);

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, campusId: user.campusId },
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Returns current user based on JWT — used to restore session on page reload
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, campusId: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('[AUTH] Me error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve user.' });
  }
});

module.exports = router;
