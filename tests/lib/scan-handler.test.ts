import { describe, it, expect } from 'vitest';
import { canPerformAction, inferScanAction } from '@/lib/tracking/scan-handler';

describe('inferScanAction', () => {
  it('suggests registered for registration counter, no visit', () => {
    const r = inferScanAction({
      selectedRoomId: 'r1',
      selectedIsRegistration: true,
      visit: null,
    });
    expect(r.suggested).toBe('registered');
    expect(r.needsInferredOut).toBe(false);
    expect(r.warning).toBeNull();
  });

  it('warns if scanning registration on already-registered visit', () => {
    const r = inferScanAction({
      selectedRoomId: 'r1',
      selectedIsRegistration: true,
      visit: { currentRoomId: null, exists: true },
    });
    expect(r.suggested).toBe('registered');
    expect(r.warning).toContain('đã được đăng ký');
  });

  it('suggests room_in when visit does not exist (with warning)', () => {
    const r = inferScanAction({
      selectedRoomId: 'r2',
      selectedIsRegistration: false,
      visit: null,
    });
    expect(r.suggested).toBe('room_in');
    expect(r.warning).toContain('chưa có sự kiện đăng ký');
  });

  it('suggests room_in when visit exists but no current room', () => {
    const r = inferScanAction({
      selectedRoomId: 'r2',
      selectedIsRegistration: false,
      visit: { currentRoomId: null, exists: true },
    });
    expect(r.suggested).toBe('room_in');
    expect(r.needsInferredOut).toBe(false);
    expect(r.warning).toBeNull();
  });

  it('suggests room_out when visit is currently in this room', () => {
    const r = inferScanAction({
      selectedRoomId: 'r2',
      selectedIsRegistration: false,
      visit: { currentRoomId: 'r2', exists: true },
    });
    expect(r.suggested).toBe('room_out');
    expect(r.needsInferredOut).toBe(false);
  });

  it('suggests room_in + needsInferredOut when visit is in a different room', () => {
    const r = inferScanAction({
      selectedRoomId: 'r3',
      selectedIsRegistration: false,
      visit: { currentRoomId: 'r2', exists: true },
    });
    expect(r.suggested).toBe('room_in');
    expect(r.needsInferredOut).toBe(true);
    expect(r.inferredOutForRoomId).toBe('r2');
    expect(r.warning).toContain('chưa check-out');
  });
});

describe('canPerformAction', () => {
  it('rejects room_out when visit does not exist', () => {
    const r = canPerformAction('room_out', {
      selectedRoomId: 'r2',
      selectedIsRegistration: false,
      visit: null,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects room_out when patient is in a different room', () => {
    const r = canPerformAction('room_out', {
      selectedRoomId: 'r2',
      selectedIsRegistration: false,
      visit: { currentRoomId: 'r3', exists: true },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('phòng khác');
  });

  it('rejects room_out when patient is in no room', () => {
    const r = canPerformAction('room_out', {
      selectedRoomId: 'r2',
      selectedIsRegistration: false,
      visit: { currentRoomId: null, exists: true },
    });
    expect(r.ok).toBe(false);
  });

  it('allows room_out when patient is in this room', () => {
    const r = canPerformAction('room_out', {
      selectedRoomId: 'r2',
      selectedIsRegistration: false,
      visit: { currentRoomId: 'r2', exists: true },
    });
    expect(r.ok).toBe(true);
  });

  it('allows room_in regardless of state', () => {
    const r = canPerformAction('room_in', {
      selectedRoomId: 'r2',
      selectedIsRegistration: false,
      visit: { currentRoomId: 'r5', exists: true },
    });
    expect(r.ok).toBe(true);
  });

  it('allows registered regardless of state', () => {
    const r = canPerformAction('registered', {
      selectedRoomId: 'r1',
      selectedIsRegistration: true,
      visit: null,
    });
    expect(r.ok).toBe(true);
  });
});
