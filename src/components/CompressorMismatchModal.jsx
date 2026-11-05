import PartMismatchModal from "./PartMismatchModal";

// Discrepancia de compresor contra la orden. Mantiene la misma firma de props
// que antes (la usa PaletizationView); el JSX vive en PartMismatchModal.
function CompressorMismatchModal({
  open,
  onClose,
  expectedMaterial,
  scannedSerial,
  expectedPrefix,
  scannedPrefix,
}) {
  return (
    <PartMismatchModal
      open={open}
      onClose={onClose}
      title="Compresor incorrecto"
      subtitle="El material del compresor escaneado NO corresponde al de la orden."
      expectedLabel="Material esperado por la orden"
      scannedLabel="Compresor escaneado"
      expectedMaterial={expectedMaterial}
      scannedSerial={scannedSerial}
      expectedPrefix={expectedPrefix}
      scannedPrefix={scannedPrefix}
    />
  );
}

export default CompressorMismatchModal;
