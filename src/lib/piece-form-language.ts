import type { CompanyLocale } from "@/components/company/company-content";

const spanish: Record<string, string> = {
  "Product": "Producto",
  "Brand": "Marca",
  "System": "Sistema",
  "Configuration": "Configuración",
  "Product Specifications": "Especificaciones del producto",
  "Product required": "Selecciona un producto.",
  "Brand required": "Selecciona una marca.",
  "System required": "Selecciona un sistema.",
  "Config required": "Selecciona una configuración.",
  "Select product": "Selecciona un producto",
  "Select brand": "Selecciona una marca",
  "Select system": "Selecciona un sistema",
  "Select configuration": "Selecciona una configuración",
  "(saved)": "(guardado)",
  "This configuration is currently unavailable. Select another configuration before recalculating.": "Esta configuración no está disponible. Elige otra antes de volver a calcular.",
  "Frame Color": "Color del marco",
  "Frame color matches design color": "El color del marco coincide con el del diseño",
  "Matches Design Color.": "Coincide con el color del diseño.",
  "Select a design color": "Selecciona un color de diseño",
  "Select frame color": "Selecciona un color de marco",
  "Color required": "Selecciona un color.",
  "Glass Color": "Color del vidrio",
  "Select glass color": "Selecciona un color de vidrio",
  "Glass Color required": "Selecciona un color de vidrio.",
  "No active Glass Color is configured for this Brand.": "Esta marca no tiene colores de vidrio activos.",
  "Coating": "Recubrimiento",
  "Select coating": "Selecciona un recubrimiento",
  "Coating required": "Selecciona un recubrimiento.",
  "No active Coating is configured for this Brand.": "Esta marca no tiene recubrimientos activos.",
  "Privacy": "Privacidad",
  "Select privacy": "Selecciona una opción de privacidad",
  "Privacy required": "Selecciona una opción de privacidad.",
  "No active Privacy is configured for this Brand.": "Esta marca no tiene opciones de privacidad activas.",
  "Details & Size": "Detalles y medidas",
  "Mark": "Identificador de la pieza",
  "Quantity": "Cantidad",
  "Select a configuration to see required dimensions.": "Selecciona una configuración para ver las medidas necesarias.",
  "(inches)": "(pulgadas)",
  "Width": "Ancho",
  "Height": "Altura",
  "Opening Width": "Ancho de la abertura",
  "Open Height": "Altura de la abertura",
  "Opening Height": "Altura de la abertura",
  "Sash Height": "Altura de la hoja",
  "Window Height": "Altura de la ventana",
  "Height Left": "Altura izquierda",
  "Height Right": "Altura derecha",
  "Leg Height": "Altura del tramo vertical",
  "Door Width": "Ancho de la puerta",
  "Door Height": "Altura de la puerta",
  "Left Sidelite Width": "Ancho del panel lateral izquierdo",
  "Right Sidelite Width": "Ancho del panel lateral derecho",
  "Min 19.625″. Cannot exceed half of total height.": "El mínimo es 19.625″ y el máximo es la mitad de la altura total.",
  "Height of the upper Single Hung. Must be less than Open Height.": "Altura de la ventana Single Hung superior. Debe ser menor que la altura de la abertura.",
  "Left Panels": "Paneles izquierdos",
  "Right Panels": "Paneles derechos",
  "Panel Count": "Cantidad de paneles",
  "Automatic from configuration.": "La configuración determina la cantidad automáticamente.",
  "Horizontal Heights": "Alturas de los travesaños",
  "Horizontal Height": "Altura del travesaño",
  "Positions from bottom. Min spacing": "Posiciones medidas desde la base. Separación mínima",
  "Add": "Agregar",
  "No horizontal heights added.": "Todavía no has agregado alturas de travesaños.",
  "This configuration does not require specific dimensions for calculation.": "Esta configuración se puede calcular sin medidas específicas.",
  "Options": "Opciones",
  "Glass Type": "Tipo de vidrio",
  "Select glass type": "Selecciona un tipo de vidrio",
  "Glass type required": "Selecciona un tipo de vidrio.",
  "This glass is currently unavailable. Select another glass before recalculating.": "Este vidrio no está disponible. Selecciona otro antes de volver a calcular.",
  "Select a Reinforcement option first.": "Selecciona primero un refuerzo.",
  "No rated glass is available for this System + Config + Reinforcement.": "No hay vidrio clasificado para esta combinación de sistema, configuración y refuerzo.",
  "No rated glass is available for this System + Config.": "No hay vidrio clasificado para esta combinación de sistema y configuración.",
  "Active": "Hoja activa",
  "Select active...": "Selecciona la hoja activa…",
  "Preparation": "Preparación",
  "Select preparation...": "Selecciona la preparación…",
  "High Bottom": "Travesaño inferior alto",
  "Applies High Bottom to this piece.": "Aplica el travesaño inferior alto a esta pieza.",
  "Screen": "Mosquitero",
  "Screen is allowed for this configuration and is selected by default.": "Esta configuración admite mosquitero y lo incluye de forma predeterminada.",
  "Sill": "Umbral",
  "Select sill...": "Selecciona un umbral…",
  "Reinforcement": "Refuerzo",
  "Select reinforcement...": "Selecciona un refuerzo…",
  "Muntin": "Patrón de barras",
  "Door designs use Full View. Remove the design to choose a muntin.": "Los diseños de puerta usan Full View. Quita el diseño si quieres elegir un patrón de barras.",
  "Select a configuration first to configure muntin.": "Selecciona primero una configuración para elegir el patrón de barras.",
  "Select pattern...": "Selecciona un patrón…",
  "Muntin Type": "Tipo de barra",
  "Select type...": "Selecciona un tipo…",
  "This pattern is included in the specification. A drawing preview is not available.": "Este patrón se incluye en las especificaciones. No tiene vista previa.",
  "Window Wall uses the same grid in every glass panel. Reconfigure the saved grids to choose one Horizontal and Vertical setting for all panels.": "Window Wall usa el mismo patrón de barras en todos los paneles de vidrio. Reconfigura los patrones guardados para aplicar los mismos valores horizontales y verticales a todos los paneles.",
  "Reconfigure grid": "Reconfigurar el patrón de barras",
  "This configuration supports Full View only.": "Esta configuración solo admite Full View.",
  "This configuration does not define a muntin panel layout.": "Esta configuración no define cómo se distribuyen las barras en los paneles.",
  "Results": "Resultados",
  "Your Price (Unit):": "Tu precio por unidad:",
  "Your Price (Line):": "Tu subtotal:",
  "Design Pressures": "Presiones de diseño",
  "Dealer Pricing": "Precios del distribuidor",
  "Dealer Markup (%)": "Recargo del distribuidor (%)",
  "Updates automatically when you leave the field.": "Se actualiza al salir del campo.",
  "Customer Price (Unit):": "Precio por unidad para el cliente:",
  "Customer Subtotal (Line):": "Subtotal para el cliente:",
  "Your Net Profit (Line):": "Tu ganancia neta en esta línea:",
  "Preview": "Vista previa",
  "Cancel": "Cancelar",
  "Edit": "Editar",
  "Calculate": "Calcular",
  "Submit": "Guardar pieza",
  "Design removed. Select a frame color before calculating.": "Se quitó el diseño. Selecciona un color de marco antes de calcular.",
  "Select an available door design or No design before calculating.": "Selecciona un diseño de puerta disponible o la opción sin diseño antes de calcular.",
  "Failed to load rated glass options.": "No se pudieron cargar las opciones de vidrio clasificado.",
  "The saved muntin selection is unavailable for this glass and configuration. Select an available pattern before calculating again.": "El patrón de barras guardado no está disponible para este vidrio y configuración. Elige otro patrón antes de volver a calcular.",
  "The previous muntin selection is unavailable for this glass and configuration. Full View has been selected; review the selection and calculate again.": "El patrón de barras anterior no está disponible para este vidrio y configuración. Se seleccionó Full View. Revisa la selección y vuelve a calcular.",
  "Leg Height must be less than Height.": "La altura del tramo vertical debe ser menor que la altura total.",
  "The selected configuration is currently unavailable in estimates.": "La configuración seleccionada no está disponible para cotizaciones.",
  "The base pricing configuration is unavailable for this piece. Review the series settings before recalculating.": "La configuración del precio base no está disponible para esta pieza. Revisa los ajustes de la serie antes de volver a calcular.",
  "The selected glass is currently unavailable. Select another glass before recalculating.": "El vidrio seleccionado no está disponible. Selecciona otro antes de volver a calcular.",
  "Please complete the required fields before calculating.": "Completa los campos obligatorios antes de calcular.",
  "Please select a configuration first.": "Selecciona primero una configuración.",
  "Sash Height cannot be less than 19.625 inches.": "La altura de la hoja debe ser de al menos 19.625 pulgadas.",
  "Open Height is required to validate Window Height.": "Ingresa la altura de la abertura para validar la altura de la ventana.",
  "Window Height must be less than Open Height.": "La altura de la ventana debe ser menor que la altura de la abertura.",
  "Horizontal Heights cannot contain duplicate positions.": "Cada travesaño debe tener una altura distinta.",
  "A base pricing selection is required. Review the series settings before calculating.": "Falta una selección para calcular el precio base. Revisa los ajustes de la serie antes de calcular.",
  "Please select a valid glass type.": "Selecciona un tipo de vidrio válido.",
  "No dimension policy exists for this System + Config + Crystal combination.": "No hay reglas de dimensiones para esta combinación de sistema, configuración y vidrio.",
  "No dimension policy exists for this System + Config + Crystal.": "No hay reglas de dimensiones para esta combinación de sistema, configuración y vidrio.",
  "No dimension policy exists for this System + Config + Crystal + Reinforcement.": "No hay reglas de dimensiones para esta combinación de sistema, configuración, vidrio y refuerzo.",
  "The entered dimensions are not allowed for this piece. Please review and adjust the measurements.": "Las medidas ingresadas no están permitidas para esta pieza. Revisa y ajusta las medidas.",
  "Dimension validation failed.": "No se pudieron validar las medidas.",
  "Piece calculated successfully.": "Se calculó la pieza.",
  "Error during calculation": "No se pudo calcular la pieza.",
  "Qty is required": "Ingresa una cantidad.",
  "Min qty is 1": "La cantidad mínima es 1.",
  "Min value is 1": "El valor mínimo es 1.",
  "Active option is required": "Selecciona la hoja activa.",
  "Preparation option is required": "Selecciona una preparación.",
  "Sill option is required": "Selecciona un umbral.",
  "Reinforcement option is required": "Selecciona un refuerzo.",
  "Select both a design and a design color.": "Selecciona un diseño y su color.",
  "Designs are not available for this product and series. Remove the design or select another series.": "No hay diseños disponibles para este producto y serie. Quita el diseño o selecciona otra serie.",
  "This design and color combination is no longer available. Select an available combination or remove the design.": "Esta combinación de diseño y color ya no está disponible. Selecciona otra combinación o quita el diseño.",
  "Link this Design Color to a Frame Color in Garage Designs before calculating.": "Asocia este color de diseño a un color de marco en los diseños de garaje antes de calcular.",
  "The Frame Color linked to this Design Color is unavailable for this series. Enable it in Manage Frame Colors.": "El color del marco asociado al diseño no está disponible para esta serie. Actívalo en la administración de colores de marco.",
  "Sash Height (inches)": "Altura de la hoja (pulgadas)",
  "Window Height (inches)": "Altura de la ventana (pulgadas)",
  "Height Left (inches)": "Altura izquierda (pulgadas)",
  "Height Right (inches)": "Altura derecha (pulgadas)",
  "Leg Height (inches)": "Altura del tramo vertical (pulgadas)",
  "Door Width (inches)": "Ancho de la puerta (pulgadas)",
  "Door Height (inches)": "Altura de la puerta (pulgadas)",
  "Left Sidelite Width (inches)": "Ancho del panel lateral izquierdo (pulgadas)",
  "Right Sidelite Width (inches)": "Ancho del panel lateral derecho (pulgadas)"
};

export function pieceFormText(locale: CompanyLocale, text: string) {
  return locale === "es" && Object.hasOwn(spanish, text) ? spanish[text] : text;
}

// RHF keeps validation messages with the field. Localize them when displayed so
// an open form can change language without revalidating or changing its values.
export function pieceFormMessage(locale: CompanyLocale, message?: string | null): string {
  if (!message) return "";
  if (locale === "es") {
    const required = /^(.+) is required$/.exec(message);
    if (required && spanish[required[1]]) return `Completa el campo «${spanish[required[1]]}».`;
    const markLength = /^Mark must be (\d+) characters or fewer\.$/.exec(message);
    if (markLength) return `El identificador de la pieza puede tener hasta ${markLength[1]} caracteres.`;
    const rule = /^No ([A-Z_]+) rules found for this policy\.$/.exec(message);
    if (rule) return `La política de dimensiones no incluye reglas de tipo ${rule[1]}.`;
  }
  return pieceFormText(locale, message);
}

export function pieceDimensionError(locale: CompanyLocale, message: string): string {
  const split = message.indexOf(": ");
  if (split === -1) return message;
  const field = message.slice(0, split);
  const reason = message.slice(split + 2);
  if (locale === "es") {
    const label = field.replace(/^Horizontal Height (\d+)$/, "Altura del travesaño $1");
    return `${pieceFormText(locale, label)}: ${reason}`;
  }
  const messages: Record<string, string> = {
    "no puede ser negativo.": "cannot be negative.",
    'solo se permiten fracciones en incrementos de 1/8" (1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8).': 'use increments of 1/8".',
    "solo se permiten fracciones con denominador 2, 4 u 8 (1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8).": "use fractions with a denominator of 2, 4 or 8.",
    'fracción fuera de rango permitido (0" a 7/8").': 'the fraction must be between 0" and 7/8".',
  };
  const english = messages[reason] ?? reason
    .replace(/^debe ser al menos ([\d.]+)" de altura\/ancho\.$/, 'must be at least $1".')
    .replace(/^valor inválido \(([\s\S]*)\)\.$/, "invalid value ($1).");
  return `${field}: ${english}`;
}
