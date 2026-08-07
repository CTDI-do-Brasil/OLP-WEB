/* ==========================================================================
   WMS RECEBIMENTO DE UNIDADES - MODEL RULES & VALIDATION ENGINE
   ========================================================================== */

/**
 * Validates a single scanned value against defined field rules.
 * @param {string} value The scanned string
 * @param {object} ruleObj Rule configuration for this field
 * @returns {object} { isValid: boolean, errorMsg: string }
 */
function validateFieldRule(value, ruleObj) {
  if (!value) {
    return { isValid: false, errorMsg: "Campo obrigatório" };
  }

  const valTrim = value.trim().toUpperCase();

  // Rule 1: Length Validation
  if (ruleObj.lengthType === 'EXACT') {
    if (valTrim.length !== parseInt(ruleObj.exactLength)) {
      return { 
        isValid: false, 
        errorMsg: `Deve conter exatamente ${ruleObj.exactLength} caracteres (Atual: ${valTrim.length})` 
      };
    }
  } else if (ruleObj.lengthType === 'RANGE') {
    const minL = parseInt(ruleObj.minLength || 0);
    const maxL = parseInt(ruleObj.maxLength || 99);
    if (valTrim.length < minL || valTrim.length > maxL) {
      return { 
        isValid: false, 
        errorMsg: `Tamanho deve ser entre ${minL} e ${maxL} caracteres` 
      };
    }
  }

  // Rule 2: Prefix Validation (Supports multiple prefixes comma separated, e.g. "GPON,48575443,ZTEG")
  if (ruleObj.prefixes && ruleObj.prefixes.trim() !== '') {
    const allowedPrefixes = ruleObj.prefixes.split(',').map(p => p.trim().toUpperCase()).filter(p => p.length > 0);
    if (allowedPrefixes.length > 0) {
      const matchesAnyPrefix = allowedPrefixes.some(prefix => valTrim.startsWith(prefix));
      if (!matchesAnyPrefix) {
        return { 
          isValid: false, 
          errorMsg: `Prefixo inválido. Deve iniciar com: ${allowedPrefixes.join(' ou ')}` 
        };
      }
    }
  }

  return { isValid: true, errorMsg: "Válido" };
}

/**
 * Validates duplicate values across fields in the same item scan.
 * e.g., SERIAL cannot equal MAC or GPON.
 * @param {Array<string>} scannedValues Array of scanned values
 * @returns {object} { hasDuplicate: boolean, duplicateVal: string }
 */
function checkInterFieldDuplicates(scannedValues) {
  const cleanValues = scannedValues.map(v => (v || '').trim().toUpperCase()).filter(v => v !== '');
  const seen = new Set();
  
  for (const val of cleanValues) {
    if (seen.has(val)) {
      return { hasDuplicate: true, duplicateVal: val };
    }
    seen.add(val);
  }
  return { hasDuplicate: false, duplicateVal: null };
}

/**
 * Validates if any of the scanned barcodes already exist in historical database.
 * @param {object} item { serial, gpon, mac }
 * @param {Array<object>} existingDatabase
 * @returns {object} { isDuplicate: boolean, conflictField: string, conflictVal: string, conflictRecord: object }
 */
function checkDatabaseDuplicates(item, existingDatabase) {
  const serialClean = (item.serial || '').trim().toUpperCase();
  const gponClean = (item.gpon || '').trim().toUpperCase();
  const macClean = (item.mac || '').trim().toUpperCase();

  for (const rec of existingDatabase) {
    const recSerial = (rec.serial || '').trim().toUpperCase();
    const recGpon = (rec.gpon || '').trim().toUpperCase();
    const recMac = (rec.mac || '').trim().toUpperCase();

    if (serialClean && (serialClean === recSerial || serialClean === recGpon || serialClean === recMac)) {
      return { isDuplicate: true, conflictField: 'SERIAL', conflictVal: serialClean, conflictRecord: rec };
    }
    if (gponClean && (gponClean === recSerial || gponClean === recGpon || gponClean === recMac)) {
      return { isDuplicate: true, conflictField: 'GPON', conflictVal: gponClean, conflictRecord: rec };
    }
    if (macClean && (macClean === recSerial || macClean === recGpon || macClean === recMac)) {
      return { isDuplicate: true, conflictField: 'MAC', conflictVal: macClean, conflictRecord: rec };
    }
  }

  return { isDuplicate: false };
}
