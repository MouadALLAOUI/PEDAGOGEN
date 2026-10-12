/**
 * Calendrier Scolaire Officiel Marocain — Cycle Collégial (Ministère de l'Éducation Nationale)
 * Intègre les vacances intermédiaires, fêtes nationales et religieuses, et le calcul du volume horaire.
 */

export interface MoroccoHoliday {
  id: string;
  nom: string;
  nomArabe?: string;
  dateDebut: string; // YYYY-MM-DD
  dateFin: string;   // YYYY-MM-DD (inclusive)
  type: 'vacances' | 'fete_nationale' | 'fete_religieuse';
  dureeJours: number;
}

export interface AcademicWeek {
  semaineNumero: number;
  semestre: 1 | 2;
  dateDebut: string;
  dateFin: string;
  estVacances: boolean;
  vacancesNom?: string;
}

export interface TeachingVolumeStats {
  totalSeances: number;
  seancesRealisees: number;
  seancesPlanifiees: number;
  seancesAbsenceOuReportees: number;
  heuresRealisees: number;
  heuresPlanifiees: number;
  volumePrevuAnnuel: number; // ex: 68h pour 2h/semaine ou 102h pour 3h/semaine
  tauxRealisation: number;   // pourcentage
  semainesActives: number;
  semainesRestantes: number;
  prochainesVacances?: MoroccoHoliday | null;
}

/**
 * Liste des vacances et jours fériés scolaires pour l'année scolaire 2025-2026 / 2026-2027
 */
export const MOROCCO_HOLIDAYS_2025_2026: MoroccoHoliday[] = [
  // 1er Semestre
  {
    id: 'aid_mawlid_2025',
    nom: 'Aïd Al Mawlid Annabawi',
    nomArabe: 'عيد المولد النبوي الشريف',
    dateDebut: '2025-09-05',
    dateFin: '2025-09-06',
    type: 'fete_religieuse',
    dureeJours: 2,
  },
  {
    id: 'vacances_inter_1_2025',
    nom: '1ère Période de vacances intermédiaires',
    nomArabe: 'العطلة البينية الأولى',
    dateDebut: '2025-10-19',
    dateFin: '2025-10-26',
    type: 'vacances',
    dureeJours: 8,
  },
  {
    id: 'marche_verte_2025',
    nom: 'Anniversaire de la Marche Verte',
    nomArabe: 'ذكرى المسيرة الخضراء',
    dateDebut: '2025-11-06',
    dateFin: '2025-11-06',
    type: 'fete_nationale',
    dureeJours: 1,
  },
  {
    id: 'fete_independance_2025',
    nom: "Fête de l'Indépendance",
    nomArabe: 'عيد الاستقلال',
    dateDebut: '2025-11-18',
    dateFin: '2025-11-18',
    type: 'fete_nationale',
    dureeJours: 1,
  },
  {
    id: 'vacances_inter_2_2025',
    nom: '2ème Période de vacances intermédiaires',
    nomArabe: 'العطلة البينية الثانية',
    dateDebut: '2025-12-07',
    dateFin: '2025-12-14',
    type: 'vacances',
    dureeJours: 8,
  },
  {
    id: 'nouvel_an_2026',
    nom: 'Nouvel An',
    nomArabe: 'رأس السنة الميلادية',
    dateDebut: '2026-01-01',
    dateFin: '2026-01-01',
    type: 'fete_nationale',
    dureeJours: 1,
  },
  {
    id: 'manifeste_independance_2026',
    nom: "Manifeste de l'Indépendance",
    nomArabe: 'تقديم وثيقة الاستقلال',
    dateDebut: '2026-01-11',
    dateFin: '2026-01-11',
    type: 'fete_nationale',
    dureeJours: 1,
  },
  {
    id: 'nouvel_an_amazigh_2026',
    nom: 'Nouvel An Amazigh',
    nomArabe: 'رأس السنة الأمازيغية',
    dateDebut: '2026-01-14',
    dateFin: '2026-01-14',
    type: 'fete_nationale',
    dureeJours: 1,
  },
  {
    id: 'vacances_fin_semestre_1_2026',
    nom: 'Vacances de fin de 1er semestre',
    nomArabe: 'عطلة منتصف السنة الدراسية',
    dateDebut: '2026-01-25',
    dateFin: '2026-02-01',
    type: 'vacances',
    dureeJours: 8,
  },

  // 2ème Semestre
  {
    id: 'vacances_inter_3_2026',
    nom: '3ème Période de vacances intermédiaires',
    nomArabe: 'العطلة البينية الثالثة',
    dateDebut: '2026-03-15',
    dateFin: '2026-03-22',
    type: 'vacances',
    dureeJours: 8,
  },
  {
    id: 'aid_fitr_2026',
    nom: 'Aïd Al Fitr',
    nomArabe: 'عيد الفطر المبارك',
    dateDebut: '2026-03-20',
    dateFin: '2026-03-23',
    type: 'fete_religieuse',
    dureeJours: 4,
  },
  {
    id: 'fete_travail_2026',
    nom: 'Fête du Travail',
    nomArabe: 'عيد الشغل',
    dateDebut: '2026-05-01',
    dateFin: '2026-05-01',
    type: 'fete_nationale',
    dureeJours: 1,
  },
  {
    id: 'vacances_inter_4_2026',
    nom: '4ème Période de vacances intermédiaires',
    nomArabe: 'العطلة البينية الرابعة',
    dateDebut: '2026-05-03',
    dateFin: '2026-05-10',
    type: 'vacances',
    dureeJours: 8,
  },
  {
    id: 'aid_adha_2026',
    nom: 'Aïd Al Adha',
    nomArabe: 'عيد الأضحى المبارك',
    dateDebut: '2026-05-27',
    dateFin: '2026-05-30',
    type: 'fete_religieuse',
    dureeJours: 4,
  },
];

/**
 * Vérifie si une date donnée (YYYY-MM-DD) est un jour férié ou une période de vacances.
 */
export function checkMoroccoHoliday(dateStr: string): MoroccoHoliday | null {
  if (!dateStr) return null;
  const d = dateStr.slice(0, 10);
  for (const h of MOROCCO_HOLIDAYS_2025_2026) {
    if (d >= h.dateDebut && d <= h.dateFin) {
      return h;
    }
  }
  return null;
}

/**
 * Retourne la prochaine période de vacances par rapport à une date donnée (ou aujourd'hui).
 */
export function getNextMoroccoHoliday(refDate = new Date().toISOString().slice(0, 10)): MoroccoHoliday | null {
  const upcoming = MOROCCO_HOLIDAYS_2025_2026
    .filter((h) => h.dateFin >= refDate)
    .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));
  return upcoming[0] || null;
}

/**
 * Calcule les semaines scolaires d'une année (du 8 sept au 30 juin),
 * en identifiant les semaines utiles d'enseignement vs les semaines neutralisées par les vacances.
 */
export function computeMoroccanAcademicWeeks(startYear = 2025): AcademicWeek[] {
  const weeks: AcademicWeek[] = [];
  // Début année scolaire : 2e lundi de septembre
  const startDate = new Date(startYear, 8, 8); // 8 Septembre
  let currentMonday = new Date(startDate);
  
  // Align to Monday
  const day = currentMonday.getDay();
  const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
  currentMonday.setDate(diff);

  let weekNum = 1;
  const endDate = new Date(startYear + 1, 5, 30); // 30 Juin

  while (currentMonday <= endDate && weekNum <= 42) {
    const mondayStr = currentMonday.toISOString().slice(0, 10);
    const sunday = new Date(currentMonday);
    sunday.setDate(sunday.getDate() + 6);
    const sundayStr = sunday.toISOString().slice(0, 10);

    const holidayInWeek = MOROCCO_HOLIDAYS_2025_2026.find(
      (h) => h.type === 'vacances' && !(h.dateFin < mondayStr || h.dateDebut > sundayStr)
    );

    const isSemester2 = currentMonday >= new Date(startYear + 1, 1, 1);

    weeks.push({
      semaineNumero: weekNum,
      semestre: isSemester2 ? 2 : 1,
      dateDebut: mondayStr,
      dateFin: sundayStr,
      estVacances: Boolean(holidayInWeek),
      vacancesNom: holidayInWeek?.nom,
    });

    currentMonday.setDate(currentMonday.getDate() + 7);
    weekNum++;
  }

  return weeks;
}

/**
 * Calcule les statistiques d'heures d'enseignement réelles par classe.
 */
export function computeClassTeachingVolume(
  entries: Array<{
    date: string;
    heure_debut?: string;
    heure_fin?: string;
    statut: string;
  }>,
  hoursPerWeek = 2, // Collège standard: 2h ou 3h par semaine
): TeachingVolumeStats {
  const academicWeeks = computeMoroccanAcademicWeeks();
  const availableTeachingWeeks = academicWeeks.filter((w) => !w.estVacances).length || 34;
  const volumePrevuAnnuel = availableTeachingWeeks * hoursPerWeek; // e.g. 34 * 2 = 68h

  let totalMinutesDone = 0;
  let totalMinutesPlanned = 0;
  let seancesRealisees = 0;
  let seancesPlanifiees = 0;
  let seancesAbsenceOuReportees = 0;
  const distinctWeeks = new Set<string>();

  for (const e of entries) {
    let durationMins = 60; // Par défaut 1h = 60 min si heure non spécifiée
    if (e.heure_debut && e.heure_fin) {
      const parts1 = e.heure_debut.split(':');
      const parts2 = e.heure_fin.split(':');
      const h1 = Number(parts1[0]);
      const m1 = Number(parts1[1]) || 0;
      const h2 = Number(parts2[0]);
      const m2 = Number(parts2[1]) || 0;
      if (!Number.isNaN(h1) && !Number.isNaN(h2)) {
        const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff > 0) durationMins = diff;
      }
    }

    if (e.statut === 'realisee') {
      seancesRealisees++;
      totalMinutesDone += durationMins;
      if (e.date) {
        // Tag week
        const d = new Date(e.date);
        const wk = `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`;
        distinctWeeks.add(wk);
      }
    } else if (e.statut === 'planifiee') {
      seancesPlanifiees++;
      totalMinutesPlanned += durationMins;
    } else {
      seancesAbsenceOuReportees++;
    }
  }

  const heuresRealisees = Math.round((totalMinutesDone / 60) * 10) / 10;
  const heuresPlanifiees = Math.round((totalMinutesPlanned / 60) * 10) / 10;
  const tauxRealisation = volumePrevuAnnuel > 0
    ? Math.min(100, Math.round((heuresRealisees / volumePrevuAnnuel) * 100))
    : 0;

  const semainesRestantes = Math.max(0, availableTeachingWeeks - distinctWeeks.size);

  return {
    totalSeances: entries.length,
    seancesRealisees,
    seancesPlanifiees,
    seancesAbsenceOuReportees,
    heuresRealisees,
    heuresPlanifiees,
    volumePrevuAnnuel,
    tauxRealisation,
    semainesActives: distinctWeeks.size,
    semainesRestantes,
    prochainesVacances: getNextMoroccoHoliday(),
  };
}
