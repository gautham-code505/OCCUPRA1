import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

import { config } from '../config';

const JWT_SECRET = config.jwtSecret;

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Role is never taken from the client: public sign-up always creates students.
    const { email, password, name, department, phoneNo, rollNo } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }
    if (typeof email !== 'string' || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        department: department || null,
        phoneNo: phoneNo || null,
        rollNo: rollNo || null,
        role: 'STUDENT',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        phoneNo: true,
        rollNo: true,
        createdAt: true,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        phoneNo: true,
        rollNo: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Shared demo accounts: anyone can log in with them, so their password must not be changeable
const DEMO_ACCOUNTS = new Set(['student@campus.ai', 'admin@campus.ai']);

const cleanText = (v: unknown, max: number): string | null | undefined => {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

/** PUT /api/auth/me — update own account info (email and role are not editable here). */
export const updateMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, department, phoneNo, rollNo } = req.body ?? {};
    const data: Record<string, string | null> = {};
    const n = cleanText(name, 80);
    if (n !== undefined) {
      if (!n || n.length < 2) {
        res.status(400).json({ error: 'Name must be at least 2 characters' });
        return;
      }
      data.name = n;
    }
    const d = cleanText(department, 120);
    if (d !== undefined) data.department = d;
    const p = cleanText(phoneNo, 20);
    if (p !== undefined) {
      if (p && !/^[+\d][\d\s-]{6,19}$/.test(p)) {
        res.status(400).json({ error: 'Phone number looks invalid' });
        return;
      }
      data.phoneNo = p;
    }
    const r = cleanText(rollNo, 30);
    if (r !== undefined) data.rollNo = r;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: { id: true, email: true, name: true, role: true, department: true, phoneNo: true, rollNo: true, avatarUrl: true, createdAt: true },
    });
    res.json({ user });
  } catch (error) {
    console.error('Update me error:', error);
    res.status(500).json({ error: 'Could not update account' });
  }
};

/** PUT /api/auth/password — change own password (requires the current one). */
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      res.status(400).json({ error: 'Current and new password are required' });
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      res.status(400).json({ error: 'New password must be 8–128 characters' });
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      res.status(400).json({ error: 'New password must contain letters and numbers' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (DEMO_ACCOUNTS.has(user.email)) {
      res.status(403).json({ error: 'The shared demo account password cannot be changed. Register your own account to try this.' });
      return;
    }
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      res.status(400).json({ error: 'New password must be different from the current one' });
      return;
    }
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 10) } });
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Could not change password' });
  }
};
