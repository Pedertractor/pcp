import { httpClient } from '@/lib/http-client';
import type {
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
