import { NextResponse } from 'next/server';

const SAMPLE = `nom;prenom;CNE;classe;niveau;genre
Amrani;Youssef;R130012345;2AC - Classe 1;2AC;M
Bennis;Salma;R130012346;2AC - Classe 1;2AC;F
El Idrissi;Omar;R130012347;;3AC;M`;

/** Modèle CSV à remplir pour l'import d'élèves. */
export async function GET() {
  return new NextResponse('\uFEFF' + SAMPLE, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modele_import_eleves.csv"',
    },
  });
}
