import type { EventType } from '@/types/event';

export type ScanAction = 'registered' | 'room_in' | 'room_out';

export interface ScanInferenceInput {
  /** Phòng hiện tại nhân viên đã chọn (kết quả từ RoomPicker). */
  selectedRoomId: string;
  /** Phòng đó có phải quầy đăng ký không? */
  selectedIsRegistration: boolean;
  /** Visit hiện tại — null nếu chưa tồn tại. */
  visit: {
    currentRoomId: string | null;
    exists: boolean;
  } | null;
}

export interface ScanInferenceResult {
  /** Action suggest dựa trên trạng thái. Nhân viên có thể override. */
  suggested: ScanAction;
  /** Có cần tạo OUT inferred cho phòng cũ không? */
  needsInferredOut: boolean;
  /** roomId của phòng cũ cần tạo OUT (chỉ khi needsInferredOut=true). */
  inferredOutForRoomId: string | null;
  /** Có warning gì để hiện cho nhân viên không? */
  warning: string | null;
}

/**
 * Tính action mặc định cho scan, dựa trên trạng thái visit + phòng đã chọn.
 *
 * Logic:
 * - Phòng là registration counter → action mặc định = 'registered'.
 * - Phòng KHÔNG là registration:
 *   - visit chưa tồn tại HOẶC currentRoomId === null → 'room_in'
 *   - currentRoomId === selectedRoomId → 'room_out'
 *   - currentRoomId khác selectedRoomId → 'room_in' + needsInferredOut cho phòng cũ
 */
export function inferScanAction(input: ScanInferenceInput): ScanInferenceResult {
  const { selectedRoomId, selectedIsRegistration, visit } = input;

  if (selectedIsRegistration) {
    return {
      suggested: 'registered',
      needsInferredOut: false,
      inferredOutForRoomId: null,
      warning: visit?.exists
        ? 'Visit này đã được đăng ký trước đó — quét lại sẽ tạo event registered trùng.'
        : null,
    };
  }

  if (!visit || !visit.exists) {
    return {
      suggested: 'room_in',
      needsInferredOut: false,
      inferredOutForRoomId: null,
      warning: 'Visit chưa có sự kiện đăng ký. Vẫn cho ghi nhận nhưng sẽ flag lỗi để thống kê loại trừ.',
    };
  }

  if (visit.currentRoomId === selectedRoomId) {
    return {
      suggested: 'room_out',
      needsInferredOut: false,
      inferredOutForRoomId: null,
      warning: null,
    };
  }

  if (visit.currentRoomId && visit.currentRoomId !== selectedRoomId) {
    return {
      suggested: 'room_in',
      needsInferredOut: true,
      inferredOutForRoomId: visit.currentRoomId,
      warning: 'Bệnh nhân chưa check-out khỏi phòng trước. Hệ thống sẽ tự tạo OUT với thời gian = IN (sẽ flag lỗi cho manager).',
    };
  }

  return {
    suggested: 'room_in',
    needsInferredOut: false,
    inferredOutForRoomId: null,
    warning: null,
  };
}

/** Kiểm tra một action có hợp lệ với context không (validation guard). */
export function canPerformAction(
  action: ScanAction,
  input: ScanInferenceInput
): { ok: true } | { ok: false; reason: string } {
  const { visit } = input;

  if (action === 'room_out') {
    if (!visit || !visit.exists) {
      return { ok: false, reason: 'Bệnh nhân chưa được ghi nhận vào hệ thống.' };
    }
    if (visit.currentRoomId !== input.selectedRoomId) {
      return {
        ok: false,
        reason:
          visit.currentRoomId === null
            ? 'Bệnh nhân không đang ở phòng nào.'
            : 'Bệnh nhân đang ở phòng khác, không thể OUT khỏi phòng này.',
      };
    }
  }

  return { ok: true };
}

/** Map ScanAction sang EventType (1-1). */
export function actionToEventType(action: ScanAction): EventType {
  return action;
}
