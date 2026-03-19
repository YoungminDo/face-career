import { supabase } from './supabase';
import { JOB_COMPETENCY_MAPPING } from '@/data/mappings';
import {
  calcFitScores, determineFitType, applyRefine,
  calcAnchorScores, getTopAnchors,
  calcCapacityScores, calcEnergyScores,
  calcJobFit,
} from '@/data/scoring';
import { anchorLikertQuestions } from '@/data/questions';

const CODE_TO_TYPE: Record<string, string> = { Em: 'Empathy', Cr: 'Creative', Op: 'Operative', Ar: 'Architect' };

export async function saveDiagnosisToSupabase(data: any) {
  try {
    // 1. 사용자 조회 또는 upsert
    let user: any;
    if (data.authId) {
      // 로그인 유저: auth_id로 기존 프로필 조회 후 정보 업데이트
      const { data: existing } = await supabase
        .from('users')
        .select()
        .eq('auth_id', data.authId)
        .single();
      if (existing) {
        // 진단 시 입력한 정보로 업데이트
        await supabase.from('users').update({
          name: data.userName || existing.name,
          birth_year: data.birthYear ? parseInt(data.birthYear) : existing.birth_year,
          gender: data.gender || existing.gender,
          current_status: data.currentStatus || existing.current_status,
        }).eq('id', existing.id);
        user = existing;
      }
    }

    if (!user) {
      // 비로그인 또는 프로필 없는 경우: 새로 생성
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          name: data.userName || '회원',
          birth_year: data.birthYear ? parseInt(data.birthYear) : null,
          gender: data.gender,
          current_status: data.currentStatus,
          auth_id: data.authId || null,
        })
        .select()
        .single();
      if (userError) { console.error('User save error:', userError); return null; }
      user = newUser;
    }

    // 2. 결과 계산
    const energy = calcEnergyScores(data.energy || []);
    const focusScores = calcFitScores(data.focus || []);
    let focus = determineFitType(focusScores);
    if (focus.needsRefine && data.focusRefine?.length) {
      const refined = applyRefine(focusScores, data.focusRefine);
      focus = { ...focus, ...refined, subTypeCode: refined.primary + refined.secondary };
    }

    const likertObj: Record<string, number> = {};
    anchorLikertQuestions.forEach((q: any, i: number) => {
      likertObj[q.anchor] = data.anchorLikert?.[i] || 4;
    });
    const anchorScores = calcAnchorScores(likertObj as any, data.anchorTradeoff || []);
    const top2 = getTopAnchors(anchorScores, 2);

    const { scaled } = calcCapacityScores(data.capacity || []);
    const focusTypeName = CODE_TO_TYPE[focus.primary] || focus.primary;
    const focusSecondaryName = CODE_TO_TYPE[focus.secondary] || focus.secondary;

    const jobFits = JOB_COMPETENCY_MAPPING.map(j => ({
      job: j.job, category: j.category,
      ...calcJobFit(scaled, focusTypeName, j.comps, focusSecondaryName),
    })).sort((a, b) => b.pct - a.pct);

    const quadrantPriority: Record<string, number> = { sweet_spot: 0, potential: 1, acquired_str: 2, not_fit: 3 };
    const coreJobs = [...jobFits].sort((a, b) => {
      const pa = quadrantPriority[a.quadrant.code] ?? 3;
      const pb = quadrantPriority[b.quadrant.code] ?? 3;
      return pa !== pb ? pa - pb : b.pct - a.pct;
    });

    // 3. 진단 저장
    const { data: diagnosis, error: diagError } = await supabase
      .from('diagnoses')
      .insert({
        user_id: user.id,
        desired_job: data.desiredJob || null,
        answers: {
          energy: data.energy,
          focus: data.focus,
          focusRefine: data.focusRefine,
          anchorLikert: data.anchorLikert,
          anchorTradeoff: data.anchorTradeoff,
          anchorInterest: data.anchorInterest,
          capacity: data.capacity,
        },
        focus_primary: focus.primary,
        focus_secondary: focus.secondary,
        focus_subtype: focus.subTypeCode,
        focus_scores: focus.scores,
        anchor_scores: anchorScores,
        anchor_top2: [top2[0].anchor, top2[1].anchor],
        energy_stage: energy.stage,
        energy_level: energy.energyLevel,
        energy_motiv_pct: energy.motivPct,
        energy_action_pct: energy.actionPct,
        energy_engagement_pct: energy.engagementPct,
        core_job_1: coreJobs[0]?.job || null,
        core_job_1_pct: coreJobs[0]?.pct || 0,
        core_job_2: coreJobs[1]?.job || null,
        core_job_3: coreJobs[2]?.job || null,
        status: 'completed',
      })
      .select()
      .single();

    if (diagError) {
      console.error('Diagnosis save error:', diagError);
      return null;
    }

    return { userId: user.id, diagnosisId: diagnosis.id };
  } catch (e) {
    console.error('Save to Supabase failed:', e);
    return null;
  }
}
