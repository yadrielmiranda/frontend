import type { CompanyLocale } from "@/components/company/company-content";
import { estimateActionError } from "./estimate-action-language";

// These messages originate in the installation workflow. Notes and other saved
// project data are rendered directly and never pass through this lookup.
const workflowErrors = new Map<string, string>([
  ["The customer must accept the remeasurement schedule before measurements are recorded.", "El cliente debe aceptar la cita de medición antes de registrar las medidas."],
  ["The non-refundable installation deposit must be paid before remeasurement.", "Es necesario pagar el depósito de instalación antes de la nueva medición."],
  ["The installation revision changed. Refresh it before saving.", "La revisión de instalación cambió. Actualízala antes de guardar."],
  ["The revision has already been submitted. It must be returned for changes before editing.", "La revisión ya se envió. Debe devolverse para cambios antes de editarla."],
  ["The material revision is no longer editable.", "Esta revisión de materiales ya no se puede editar."],
  ["This combined material revision has been submitted. Return it for changes before editing.", "La revisión conjunta de materiales ya se envió. Devuélvela para cambios antes de editarla."],
  ["Use Revise order after an order has been created.", "La orden ya se creó. Usa «Revisar orden» para modificarla."],
  ["This installation is closed.", "Esta instalación está cerrada."],
  ["Edit one added unit at a time. Use Add Piece for more units.", "Edita una unidad a la vez. Usa «Agregar pieza» para agregar más unidades."],
  ["Quantity must be between 1 and 200 units.", "La cantidad debe estar entre 1 y 200 unidades."],
  ["The added unit changed. Refresh the revision.", "La unidad agregada cambió. Actualiza la revisión."],
  ["The pending added piece was not found.", "No se encontró la pieza pendiente de agregar."],
  ["The pending added piece was not found in this revision.", "No se encontró la pieza pendiente de agregar en esta revisión."],
  ["Installation measurement not found.", "No se encontró la medición de instalación."],
  ["The selected Estimate Piece occurrence was not found.", "No se encontró la unidad seleccionada en la cotización."],
  ["The fixed Panel Count for this configuration is invalid.", "La cantidad fija de paneles de esta configuración no es válida."],
  ["Use Revise order to approve the new material dimensions before confirming this measurement. An existing order cannot be changed through the original remeasurement flow.", "Usa «Revisar orden» para aprobar las nuevas medidas del material antes de confirmar esta medición."],
  ["Estimate material cannot be revised after the Order is created.", "La orden ya se creó. Revisa los cambios de material desde la orden."],
  ["Explain the reason when Other is selected.", "Explica el motivo al seleccionar «Otro»."],
  ["Configure the complete replacement Piece before saving.", "Completa la configuración de la pieza de reemplazo antes de guardarla."],
  ["The selected service is not available for field additions.", "Este servicio no está disponible para agregarlo en obra."],
  ["Services can only be added to a draft quote.", "Solo puedes agregar servicios a un borrador de cotización."],
  ["Requested services can only be changed before the installation deposit is paid.", "Solo puedes cambiar los servicios solicitados antes de pagar el depósito de instalación."],
  ["Automatic lines are controlled by system-configuration mappings.", "Los servicios automáticos se definen en la configuración del sistema."],
  ["Only a draft quote can be recalculated.", "Solo puedes recalcular una cotización en borrador."],
  ["Installation pricing must be verified before recalculating.", "Verifica el precio de instalación antes de recalcularlo."],
  ["The current installation quote is already ready. Only a changed draft requires submission.", "La cotización de instalación ya está lista. Solo tienes que enviarla si el borrador tiene cambios."],
  ["This quote is not awaiting submission.", "Esta cotización ya no está pendiente de envío."],
  ["Deposit payment and completed remeasurement are required before submitting the final quote.", "Para enviar la cotización final, es necesario pagar el depósito y completar la nueva medición."],
  ["Every Estimate Piece occurrence must have a material revision result.", "Completa la revisión de materiales de cada unidad de la cotización."],
  ["The revised Estimate must contain at least one Piece.", "La cotización revisada debe incluir al menos una pieza."],
  ["The installation quote has no services.", "La cotización de instalación no tiene servicios."],
  ["The installation quote changed. Recalculate it before submitting.", "La cotización de instalación cambió. Vuelve a calcularla antes de enviarla."],
  ["Admin approval is required at this stage.", "En esta etapa se requiere la aprobación de un administrador."],
  ["This quote is not pending admin approval.", "Esta cotización ya no está pendiente de aprobación del administrador."],
  ["This material revision is not awaiting customer approval.", "Esta revisión de materiales ya no está pendiente de aprobación del cliente."],
  ["An installation in progress or completed cannot be canceled.", "Una instalación en curso o terminada ya no se puede cancelar."],
  ["A placed order must keep its agreed installation scope. Use an approved change instead of removing installation.", "La orden ya se creó. Solicita un cambio aprobado para modificar la instalación acordada."],
  ["Installation cannot be canceled after its balance has been paid.", "La instalación ya está pagada y no se puede cancelar."],
  ["Only administrators or the internal dealer who owns the estimate can waive the deposit.", "Solo un administrador o el distribuidor interno titular de la cotización puede eximir el depósito."],
  ["This exception is only available for dealer estimates.", "Esta excepción solo se aplica a cotizaciones de distribuidores."],
  ["Dealer measurements can only be accepted while the installation deposit is pending.", "Solo puedes aceptar las medidas del distribuidor mientras esté pendiente el depósito de instalación."],
  ["This exception requires installation measurements from the estimate pieces only.", "Esta excepción requiere que todas las medidas provengan de las piezas de la cotización."],
  ["This installation did not request a permit.", "Esta instalación no tiene una solicitud de permiso."],
  ["Permit status and City Fee are frozen after material checkout starts.", "El estado del permiso y la tasa municipal quedan bloqueados al iniciar el pago del material."],
  ["Permit payment status is controlled by checkout.", "El estado del pago del permiso se actualiza al procesar el pago."],
  ["The Permit Fee must be paid before permit processing begins.", "Es necesario pagar la tarifa del permiso antes de iniciar el trámite."],
  ["City Fee can only be entered when the permit is approved.", "Solo puedes ingresar la tasa municipal al aprobar el permiso."],
  ["A valid City Fee is required when the permit is approved.", "Ingresa una tasa municipal válida para aprobar el permiso."],
  ["Cancel the open checkout before changing the City Fee.", "Cancela el pago en curso antes de cambiar la tasa municipal."],
  ["The installation deposit must be paid before scheduling remeasurement.", "Es necesario pagar el depósito de instalación antes de programar la nueva medición."],
  ["Installation must be paid before scheduling its appointment.", "Es necesario pagar la instalación antes de programar la cita."],
  ["The delivery charge must be paid before scheduling installation.", "Es necesario pagar la entrega antes de programar la instalación."],
  ["Appointment end must be after its start.", "La cita debe terminar después de la hora de inicio."],
  ["A date is already awaiting the project owner response. A new date can only be proposed after the project owner requests rescheduling.", "Ya hay una fecha pendiente de respuesta. Puedes proponer otra cuando el titular solicite un cambio de fecha."],
  ["The current appointment has already been accepted. A new date can only be proposed after the project owner requests rescheduling.", "La cita ya fue aceptada. Puedes proponer otra cuando el titular solicite un cambio de fecha."],
  ["Installation requires an accepted schedule before it can start.", "Es necesario aceptar la fecha programada antes de iniciar la instalación."],
  ["The material order is required before installation can start.", "Es necesario crear la orden de materiales antes de iniciar la instalación."],
  ["The delivery charge must be paid before installation can start.", "Es necesario pagar la entrega antes de iniciar la instalación."],
  ["The order must be delivered beforehand or assigned to delivery with installation.", "La orden debe estar entregada o tener asignada la entrega con instalación."],
  ["No approved installation quote exists.", "No hay una cotización de instalación aprobada."],
  ["Installation must be fully paid before work can start.", "Es necesario completar el pago de la instalación antes de iniciar el trabajo."],
  ["The company-managed permit must be approved before installation can start.", "El permiso que tramita la empresa debe estar aprobado antes de iniciar la instalación."],
  ["Only an installation in progress can be marked Installed.", "Solo puedes marcar como terminada una instalación en curso."],
]);

export function installationActionError(locale: CompanyLocale, error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (locale === "en") return message || "Could not update the installation.";
  const known = workflowErrors.get(message);
  if (known) return known;
  const pending = /^(\d+) opening\(s\) still require field measurement\.$/.exec(message);
  if (pending) return pending[1] === "1" ? "Falta medir una abertura en obra." : `Faltan por medir ${pending[1]} aberturas en obra.`;
  return estimateActionError(locale, error, message || "No se pudo actualizar la instalación.");
}
