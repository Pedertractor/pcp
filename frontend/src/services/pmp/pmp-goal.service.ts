import { httpClient } from '@/lib/http-client';
import type {
  PmpBlockDashboard,
  PmpBlockWeek,
  PmpWeeklyGoalDetail,
  PmpWeeklyGoalItem,
} from '@/types/pmp-goal';

export function pmpBlockWeeksQueryKey(blockId: string) {
  return ['pmp', 'blocks', blockId, 'weeks'] as const;
}

export function pmpWeeklyGoalsQueryKey(blockId: string, weekStart: string) {
  return ['pmp', 'blocks', blockId, 'weekly-goals', weekStart] as const;
}

export function pmpWeeklyGoalDetailQueryKey(blockId: string, goalId: string) {
  return ['pmp', 'blocks', blockId, 'weekly-goals', 'detail', goalId] as const;
}

export function pmpBlockDashboardQueryKey(blockId: string, weekStart: string) {
  return ['pmp', 'blocks', blockId, 'dashboard', weekStart] as const;
}

export async function getPmpBlockDashboard(
  blockId: string,
  weekStart: string,
): Promise<PmpBlockDashboard> {
  return httpClient.get<PmpBlockDashboard>(`/pmp/blocks/${blockId}/dashboard`, {
    params: { weekStart },
  });
}

export async function listPmpBlockWeeks(
  blockId: string,
): Promise<PmpBlockWeek[]> {
  return httpClient.get<PmpBlockWeek[]>(`/pmp/blocks/${blockId}/weeks`);
}

export async function listPmpWeeklyGoals(
  blockId: string,
  weekStart: string,
): Promise<PmpWeeklyGoalItem[]> {
  return httpClient.get<PmpWeeklyGoalItem[]>(
    `/pmp/blocks/${blockId}/weekly-goals`,
    { params: { weekStart } },
  );
}

export async function getPmpWeeklyGoal(
  blockId: string,
  goalId: string,
): Promise<PmpWeeklyGoalDetail> {
  return httpClient.get<PmpWeeklyGoalDetail>(
    `/pmp/blocks/${blockId}/weekly-goals/${goalId}`,
  );
}

/** Abre o sábado e redistribui o saldo de `fromDate` (padrão: hoje) até ele. */
export async function openPmpExtraDay(
  blockId: string,
  goalId: string,
  fromDate?: string,
): Promise<PmpWeeklyGoalDetail> {
  return httpClient.post<PmpWeeklyGoalDetail, { fromDate?: string }>(
    `/pmp/blocks/${blockId}/weekly-goals/${goalId}/extra-day`,
    fromDate ? { fromDate } : {},
  );
}

export async function closePmpExtraDay(
  blockId: string,
  goalId: string,
): Promise<PmpWeeklyGoalDetail> {
  return httpClient.delete<PmpWeeklyGoalDetail>(
    `/pmp/blocks/${blockId}/weekly-goals/${goalId}/extra-day`,
  );
}

export function pmpWeeklyGoalPartPreviewQueryKey(blockId: string, goalId: string) {
  return ['pmp', 'blocks', blockId, 'weekly-goals', 'part-preview', goalId] as const;
}

export async function getPmpWeeklyGoalPartPreview(
  blockId: string,
  goalId: string,
): Promise<{ imageUrl: string | null }> {
  return httpClient.get<{ imageUrl: string | null }>(
    `/pmp/blocks/${blockId}/weekly-goals/${goalId}/part-preview`,
  );
}
