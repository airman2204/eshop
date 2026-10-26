/**
 * Diccionario de traducción limpia y profesional para términos de variantes de CJ Dropshipping
 */
export function translateVariantName(rawName: string | undefined | null): string {
  if (!rawName || typeof rawName !== 'string') return 'Opción';

  let text = rawName.trim();

  // Diccionario de reemplazos exactos y por patrones comunes en CJ Dropshipping
  const replacements: [RegExp, string][] = [
    // Colores
    [/\bPink\b/gi, 'Rosa'],
    [/\bGreen\b/gi, 'Verde'],
    [/\bBlue\b/gi, 'Azul'],
    [/\bWhite\b/gi, 'Blanco'],
    [/\bBlack\b/gi, 'Negro'],
    [/\bRed\b/gi, 'Rojo'],
    [/\bYellow\b/gi, 'Amarillo'],
    [/\bPurple\b/gi, 'Morado'],
    [/\bOrange\b/gi, 'Naranja'],
    [/\bGrey\b|\bGray\b/gi, 'Gris'],
    [/\bBrown\b/gi, 'Café'],
    [/\bGold\b|\bGolden\b/gi, 'Dorado'],
    [/\bSilver\b/gi, 'Plateado'],
    [/\bRose Gold\b/gi, 'Oro Rosa'],
    [/\bBeige\b/gi, 'Beige'],
    [/\bCyan\b/gi, 'Celeste'],

    // Accesorios y papel (ej: impresoras térmicas y papelería)
    [/\bWith\s*(\d+)\s*Roll\s*White\s*Paper\b/gi, 'con $1 Rollos de Papel Blanco'],
    [/\bWith\s*(\d+)\s*Roll\s*Colorful\s*Paper\b/gi, 'con $1 Rollos de Papel de Color'],
    [/\bWith\s*(\d+)\s*Roll\s*Paper\b/gi, 'con $1 Rollos de Papel'],
    [/\bWith\s*(\d+)\s*Roll\s*Color\s*Paper\b/gi, 'con $1 Rollos de Papel Color'],
    [/\bWith\s*(\d+)\s*Rolls?\b/gi, 'con $1 Rollos'],
    [/\b(\d+)\s*Rolls?\s*White\s*Paper\b/gi, '$1 Rollos de Papel Blanco'],
    [/\b(\d+)\s*Rolls?\s*Colorful\s*Paper\b/gi, '$1 Rollos de Papel de Color'],
    [/\b(\d+)\s*Rolls?\s*Paper\b/gi, '$1 Rollos Papel'],
    [/\bWhite\s*Paper\b/gi, 'Papel Blanco'],
    [/\bColorful\s*Paper\b|\bColor\s*Paper\b/gi, 'Papel de Color'],
    [/\bSticker\s*Paper\b|\bAdhesive\s*Paper\b/gi, 'Papel Adhesivo / Etiquetas'],
    [/\bThermal\s*Paper\b/gi, 'Papel Térmico'],
    [/\bRolls?\b/gi, 'Rollos'],

    // Conectores y especificaciones de paquete
    [/\bWith\b/gi, 'con'],
    [/\bWithout\b/gi, 'sin'],
    [/\bOnly\b/gi, 'Solo'],
    [/\bSet\b/gi, 'Paquete'],
    [/\bKit\b/gi, 'Kit'],
    [/\bBox\b/gi, 'Caja'],
    [/\bPiece\b|\bPcs\b/gi, 'Pza'],
    [/\bPairs?\b/gi, 'Par'],

    // Tamaños y medidas
    [/\bSmall\b/gi, 'Chico'],
    [/\bMedium\b/gi, 'Mediano'],
    [/\bLarge\b/gi, 'Grande'],
    [/\bExtra Large\b/gi, 'Extra Grande'],

    // Conectividad
    [/\bWireless\b/gi, 'Inalámbrico'],
    [/\bBluetooth\b/gi, 'Bluetooth'],
    [/\bRechargeable\b/gi, 'Recargable'],
    [/\bBattery\b/gi, 'Batería'],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  // Limpiar separadores dobles tipo "--", "- -", " - ", espacios extras
  text = text
    .replace(/\s*-\s*-+\s*/g, ' - ')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();

  // Si comienza o termina con guion, removerlo
  text = text.replace(/^-+|-+$/g, '').trim();

  // Capitalizar primera letra de cada segmento si aplica
  return text || rawName;
}
