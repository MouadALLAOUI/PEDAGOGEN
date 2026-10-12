export function buildImagePromptsTxt(content: Record<string, unknown>): string {
  const prompts = (content.prompt_format || []) as any[];
  const lines: string[] = [];
  
  lines.push('========================================================================');
  lines.push('DIRECTIVES GÉNÉRALES DE PRODUCTION VISUELLE :');
  lines.push(`- Style de consigne : ${content.style_consigne || 'SVG ou PNG vectoriel, style dessin animé moderne, fond blanc, pas de texte long, lisible à distance, adapté à 1AC (12-13 ans)'}`);
  lines.push(`- Taille minimale du texte : ${content.taille_minimale_texte || 'police 20px ou plus'}`);
  lines.push(`- Règles de texte : ${content.interdiction_texte_anglais || 'uniquement du français (sauf termes techniques comme WiFi)'}`);
  lines.push('- Format : "16:9"');
  lines.push('- Resolution : "1920x1080"');
  lines.push('- Style : "flat design, cartoon, friendly"');
  lines.push('- Contraintes : "no_watermark, no_english_text, no_3D_realistic"');
  lines.push(`- Contraintes de Contenu : "Ne jamais générer de cartes géographiques, de frontières, d'éléments politiques (comme des drapeaux) ou de symboles religieux. Les illustrations doivent être neutres et se concentrer sur les aspects techniques de l'informatique."`);
  lines.push(`- Identité Culturelle Marocaine : "Malgré l'absence de cartes ou de symboles politiques/religieux, l'environnement doit refléter le quotidien marocain. Utilisez obligatoirement des noms et concepts familiers de la culture marocaine dans les scénarios et les étiquettes (ex: 'Ahmed', 'Yasmine', 'Dar Chabab', 'Cyber-café du quartier')."`);
  lines.push(`- Style des Personnages : "Générer exclusivement des illustrations et dessins animés flat design (aucun rendu réaliste ou photo-réaliste d'humains)."`);
  lines.push(`- Règles Vestimentaires (Modestie) : "Tous les personnages humains doivent porter des vêtements décents et couvrants adaptés au contexte scolaire marocain. Les représentations de femmes ou de filles doivent systématiquement arborer un hijab traditionnel. Interdiction stricte de générer des personnages avec des tenues légères ou dénudées."`);
  lines.push(`- Rendu des Visages : "Flouter, styliser à l'extrême ou simplifier les traits du visage des personnages (pas de détails réalistes sur les yeux, le nez ou la bouche) afin de maintenir un aspect purement conceptuel, pédagogique et neutre."`);
  lines.push('- Palette de couleurs : "blue, green, orange, white background"');
  lines.push('========================================================================');
  lines.push('');

  const allPrompts = [...prompts];
  
  for (let i = 0; i < allPrompts.length; i++) {
    const p = allPrompts[i];
    if (i > 0) lines.push('---', '');
    lines.push(`IMAGE ${i + 1} — ${p.filename || 'illustration_' + (i + 1) + '.png'}`);
    lines.push(`Usage : ${p.description || ''}`);
    lines.push(`Purpose : ${p.purpose || ''}`);
    lines.push(`Format : 16:9`);
    lines.push(`Resolution : 1920x1080`);
    lines.push(`Style : flat design, cartoon, friendly`);
    lines.push(`Constraints : no_watermark, no_english_text, no_3D_realistic`);
    lines.push(`Color Palette : blue, green, orange, white background`);
    const purpose = (p.purpose || '').toLowerCase();
    const desc = (p.description || '').toLowerCase();
    if (purpose.includes('wan') || purpose.includes('carte') || desc.includes('carte') || desc.includes('maroc') || desc.includes('network') || desc.includes('connexion') || desc.includes('internet')) {
      lines.push(`Substitution visuelle : "Ne pas utiliser de carte géographique. Représenter le réseau avec un diagramme conceptuel neutre : des icônes d'ordinateurs, de serveurs, de nuages (cloud) et des flèches de connexion. Utiliser des étiquettes comme 'Ahmed', 'Yasmine', 'Dar Chabab', 'Cyber-café du quartier'."`);
    }
    const promptText = (p.prompt || '').toLowerCase();
    if (promptText.includes('enseignante') || promptText.includes('élève') || promptText.includes('professeur') || promptText.includes('main') || promptText.includes('personne') || promptText.includes('fille') || promptText.includes('garçon') || promptText.includes('utilisateur') || promptText.includes('ahmed') || promptText.includes('yasmine') || promptText.includes('humain') || promptText.includes('enfant')) {
      lines.push(`Personnages : "Style flat design cartoon uniquement. Vêtements décents et couvrants adaptés au contexte scolaire marocain. Les femmes et filles doivent porter un hijab. Visages stylisés et simplifiés sans détails réalistes (yeux, nez, bouche épurés)."`);
    }
    lines.push(`Text Labels : ${p.text_labels_in_french || 'Textes explicatifs clairs en français uniquement. Utiliser des prénoms marocains (Ahmed, Yasmine, Fatima, Karim) et des lieux familiers (Dar Chabab, école, cyber-café).'}`);
    lines.push('');
    lines.push((p.prompt || '').trim());
    lines.push('');
  }
  
  // Append default visual prompt guide for computer shutdown advice at the end
  if (allPrompts.length > 0) {
    lines.push('---', '');
  }
  const shutdownIndex = allPrompts.length + 1;
  lines.push(`IMAGE ${shutdownIndex} — conseil_extinction_ordinateur.png`);
  lines.push(`Usage : Conseil d'utilisation en classe - Éteindre l'ordinateur correctement`);
  lines.push(`Purpose : Sensibiliser les élèves aux consignes de sécurité matériel et économie d'énergie.`);
  lines.push(`Format : 16:9`);
  lines.push(`Resolution : 1920x1080`);
  lines.push(`Style : flat design, cartoon, friendly`);
  lines.push(`Constraints : no_watermark, no_english_text, no_3D_realistic`);
  lines.push(`Color Palette : blue, green, orange, white background`);
  lines.push(`Text Labels : "1. Enregistrer son travail (Yasmine)", "2. Menu Démarrer -> Arrêter", "3. Éteindre l'écran (Ahmed)", en français, police lisible`);
  lines.push(`Personnages : "Style flat design cartoon uniquement. Vêtements décents et couvrants adaptés au contexte scolaire marocain. Les femmes/filles doivent porter un hijab. Visages stylisés et simplifiés sans détails réalistes."`);
  lines.push('');
  lines.push(`Prompt : Infographie éducative montrant les 3 étapes pour éteindre correctement un ordinateur, dans un cadre de cyber-café au Maroc. Étape 1 : icône de sauvegarde de fichier avec l'étiquette "Yasmine enregistre son travail". Étape 2 : un curseur de souris cliquant sur le bouton "Arrêter" du menu Windows en français. Étape 3 : une main appuyant sur le bouton d'alimentation physique de l'écran, avec l'étiquette "Ahmed éteint l'écran". Arrière-plan évoquant un cyber-café de quartier marocain. Style flat design vectoriel et convivial, couleurs bleue et orange prédominantes, fond blanc épuré, adapté pour affichage en classe.`);
  lines.push('');

  return lines.join('\n');
}
