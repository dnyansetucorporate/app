import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mocks for prisma functions used by auth.service
const mockUserFindUnique = vi.fn();
const mockStudentFindUnique = vi.fn();

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    student: { findUnique: mockStudentFindUnique },
  },
}));

vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

vi.mock('../../utils/jwt.js', () => ({
  signToken: vi.fn(() => 'signed-token'),
}));

import * as bcrypt from 'bcryptjs';
import { loginUser, getProfileFromPayload } from './auth.service';

describe('auth.service', () => {
  beforeEach(() => {
    mockUserFindUnique.mockReset();
    mockStudentFindUnique.mockReset();
    (bcrypt.compare as unknown as ReturnType<typeof vi.fn>)?.mockReset?.();
    (bcrypt.compare as unknown as any).mockReset?.();
  });

  it('logs in admin user with email', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      email: 'admin@test.com',
      isActive: true,
      passwordHash: 'hash',
      role: 'SUPER_ADMIN',
      name: 'Admin',
      avatar: null,
    });

    (bcrypt.compare as unknown as any).mockResolvedValue(true);

    const result = await loginUser({ identifier: 'admin@test.com', password: 'pwd' });

    expect(result.token).toBe('signed-token');
    expect(result.user.id).toBe('u1');
    expect(result.user.role).toBe('SUPER_ADMIN');
  });

  it('logs in student via PRN', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    mockStudentFindUnique.mockResolvedValue({
      id: 's1',
      prn: 'PRN1',
      isActive: true,
      firstName: 'John',
      lastName: 'Doe',
      email: 'student@test.com',
      photo: null,
      branchId: 'b1',
      credentials: [{ examDate: today, passwordHash: 'hash' }],
    });

    (bcrypt.compare as unknown as any).mockResolvedValue(true);

    const result = await loginUser({ identifier: 'PRN1', password: 'pwd' });

    expect(result.token).toBe('signed-token');
    expect(result.user.role).toBe('STUDENT');
    expect((result.user as any).studentId).toBe('s1');
  });

  it('throws on invalid credentials', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockStudentFindUnique.mockResolvedValue(null);
    (bcrypt.compare as unknown as any).mockResolvedValue(false);

    await expect(loginUser({ identifier: 'nope', password: 'x' })).rejects.toHaveProperty('status', 401);
  });

  it('getProfileFromPayload returns student profile', async () => {
    mockStudentFindUnique.mockResolvedValue({
      id: 's1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'student@test.com',
      photo: null,
      branchId: 'b1',
      createdAt: new Date(),
    });

    const profile = await getProfileFromPayload({ sub: 's1', email: 'student@test.com', role: 'STUDENT' });
    expect(profile.role).toBe('STUDENT');
    expect((profile as any).studentId).toBe('s1');
  });

  it('getProfileFromPayload returns user profile', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      name: 'Admin',
      email: 'admin@test.com',
      role: 'SUPER_ADMIN',
      avatar: null,
      createdAt: new Date(),
    });

    const profile = await getProfileFromPayload({ sub: 'u1', email: 'admin@test.com', role: 'SUPER_ADMIN' });
    expect(profile.role).toBe('SUPER_ADMIN');
    expect(profile.id).toBe('u1');
  });
});
