/**
 * Diccionario de traducción limpia y profesional para términos de variantes de CJ Dropshipping
 */
export function translateVariantName(rawName: string | undefined | null): string {
  if (!rawName || typeof rawName !== 'string') return 'Opción';

  let text = rawName.trim();

  // Diccionario de reemplazos exactos y por patrones comunes en CJ Dropshipping
  const replacements: [RegExp, string][] = [
    // Tipos de luces, cortinas y lámparas
    [/\bUSB Curtain Lights\b/gi, 'Cortina de Luces USB'],
    [/\bBall Style\b/gi, 'Estilo Esferas'],
    [/\bPlug In Type\b/gi, 'Conexión a Corriente'],
    [/\bNew Style\b/gi, 'Nuevo Diseño'],
    [/\bPlug in square\b/gi, 'Cuadrada Conexión'],
    [/\bPlug in crown\b/gi, 'Corona Conexión'],
    [/\bSquare wooden base\b/gi, 'Base de Madera Cuadrada'],
    [/\bWooden base\b/gi, 'Base de Madera'],
    [/\bVolcanic edition\b/gi, 'Edición Volcánica'],

    // Niveles de velocidad / Modos
    [/(\d+)\s*speed charging\b/gi, '$1 Velocidades Recargable'],
    [/(\d+)\s*speeds?\b/gi, '$1 Velocidades'],

    // Colores compuestos y simples
    [/\bLight pink\b/gi, 'Rosa Claro'],
    [/\bLight green\b/gi, 'Verde Claro'],
    [/\bLight blue\b/gi, 'Azul Claro'],
    [/\bRose Gold\b/gi, 'Oro Rosa'],
    [/\bChampagne\b/gi, 'Champaña'],
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
    [/\bBeige\b/gi, 'Beige'],
    [/\bCyan\b/gi, 'Celeste'],

    // Accesorios y papel (ej: impresoras térmicas y papelería)
    [/\bWith\s*(\d+)\s*Rolls?\s*White\s*Paper\b/gi, 'con $1 Rollos de Papel Blanco'],
    [/\bWith\s*(\d+)\s*Rolls?\s*Blanco\s*Paper\b/gi, 'con $1 Rollos de Papel Blanco'],
    [/\b(\d+)\s*Rolls?\s*White\s*Paper\b/gi, '$1 Rollos de Papel Blanco'],
    [/\b(\d+)\s*Rolls?\s*Blanco\s*Paper\b/gi, '$1 Rollos de Papel Blanco'],
    [/\bColorful\s*Stickers?\s*Paper\b/gi, 'Papel Adhesivo a Color'],
    [/\bStickers?\s*Paper\b/gi, 'Papel Adhesivo'],
    [/\bWith\s*(\d+)\s*Rolls?\s*Colorful\s*Paper\b/gi, 'con $1 Rollos de Papel Color'],
    [/\bWith\s*(\d+)\s*Rolls?\s*Paper\b/gi, 'con $1 Rollos de Papel'],
    [/\bWith\s*(\d+)\s*Rolls?\b/gi, 'con $1 Rollos'],
    [/\bWhite\s*Paper\b|\bBlanco\s*Paper\b/gi, 'Papel Blanco'],
    [/\bColorful\s*Paper\b|\bColor\s*Paper\b/gi, 'Papel de Color'],
    [/\bAdhesive\s*Paper\b/gi, 'Papel Adhesivo / Etiquetas'],
    [/\bThermal\s*Paper\b/gi, 'Papel Térmico'],
    [/(\d+)\s*Rolls?\b/gi, '$1 Rollos'],

    // Conectores y especificaciones de paquete
    [/\bWith\b/gi, 'con'],
    [/\bWithout\b/gi, 'sin'],
    [/\bOnly\b/gi, 'Solo'],
    [/\bSet\s*(\d+)\b/gi, 'Paquete $1'],
    [/\bSet\b/gi, 'Paquete'],
    [/\bKit\b/gi, 'Kit'],
    [/\bBox\b/gi, 'Caja'],
    [/(\d+)\s*(?:Piece|Pieces|Pcs|Pc)\b/gi, '$1 Pzas'],
    [/\bPiece\b|\bPcs\b|\bPc\b/gi, 'Pza'],
    [/\bPairs?\b/gi, 'Par'],

    // Tamaños y medidas
    [/\bSmall\b/gi, 'Chico'],
    [/\bMedium\b/gi, 'Mediano'],
    [/\bLarge\b/gi, 'Grande'],
    [/\bExtra Large\b/gi, 'Extra Grande'],

    // Conectividad y energía
    [/\bWireless\b/gi, 'Inalámbrico'],
    [/\bBluetooth\b/gi, 'Bluetooth'],
    [/\bRechargeable\b/gi, 'Recargable'],
    [/\bCharging\b/gi, 'Recargable'],
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

  return text || rawName;
}
