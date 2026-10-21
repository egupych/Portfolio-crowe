/**
 * Lightweight, zero-dependency QR Code generator in pure JavaScript.
 * Generates standalone SVG QR codes offline.
 * Based on QR Code Model 2 (ISO/IEC 18004).
 */

// Galois Field GF(256) math
const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = val;
    LOG_TABLE[val] = i;
    val = (val << 1) ^ (val & 0x80 ? 0x11d : 0);
  }
  EXP_TABLE[255] = EXP_TABLE[0];
})();

function glog(n) {
  if (n < 1) throw new Error('glog(' + n + ')');
  return LOG_TABLE[n];
}

function gexp(n) {
  while (n < 0) n += 255;
  while (n >= 256) n -= 255;
  return EXP_TABLE[n];
}

function getErrorCorrectionPolynomial(errorCorrectionLength) {
  let poly = [1];
  for (let i = 0; i < errorCorrectionLength; i++) {
    const next = [];
    const factor = gexp(i);
    for (let j = 0; j <= poly.length; j++) {
      const p1 = j < poly.length ? (poly[j] === 0 ? 0 : gexp(glog(poly[j]) + glog(factor))) : 0;
      const p2 = j > 0 ? poly[j - 1] : 0;
      next.push(p1 ^ p2);
    }
    poly = next;
  }
  return poly;
}

// QR Code capacities and configuration: Version 1 to 6 (Error Correction Level L)
// [totalDataCodewords, ecCodewords, ecBlocks]
const VERSION_PARAMS = {
  1: { size: 21, dataCodewords: 19, ecCodewords: 7, alignments: [] },
  2: { size: 25, dataCodewords: 34, ecCodewords: 10, alignments: [6, 18] },
  3: { size: 29, dataCodewords: 55, ecCodewords: 15, alignments: [6, 22] },
  4: { size: 33, dataCodewords: 80, ecCodewords: 20, alignments: [6, 26] },
  5: { size: 37, dataCodewords: 108, ecCodewords: 26, alignments: [6, 30] },
  6: { size: 41, dataCodewords: 136, ecCodewords: 18, ecBlocks: 2, alignments: [6, 34] },
};

function pickVersion(dataLength) {
  for (let v = 1; v <= 6; v++) {
    // 4 bits mode + 8 bits count for Byte mode + data
    const bitsNeeded = 4 + 8 + dataLength * 8;
    const bytesNeeded = Math.ceil(bitsNeeded / 8);
    if (bytesNeeded <= VERSION_PARAMS[v].dataCodewords) return v;
  }
  return 6;
}

function encodeData(text, version) {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);
  const params = VERSION_PARAMS[version];

  const bits = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  // Byte mode indicator: 0100
  pushBits(0b0100, 4);
  // Character count indicator (8 bits for versions 1–9)
  pushBits(rawBytes.length, 8);

  // Data bytes
  for (const b of rawBytes) {
    pushBits(b, 8);
  }

  // Terminator: up to 4 zero bits
  const maxBits = params.dataCodewords * 8;
  const termLen = Math.min(4, maxBits - bits.length);
  pushBits(0, termLen);

  // Align to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Padding bytes 0xEC and 0x11
  const pad = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxBits) {
    pushBits(pad[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to byte codewords
  const dataCodewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i + j];
    }
    dataCodewords.push(b);
  }

  // Generate Reed-Solomon Error Correction codewords
  const ecPoly = getErrorCorrectionPolynomial(params.ecCodewords);
  const ecCodewords = calculateReedSolomon(dataCodewords, ecPoly, params.ecCodewords);

  return [...dataCodewords, ...ecCodewords];
}

function calculateReedSolomon(data, poly, ecLen) {
  const msg = [...data, ...new Array(ecLen).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const factor = msg[i];
    if (factor !== 0) {
      const logFactor = glog(factor);
      for (let j = 0; j < poly.length; j++) {
        msg[i + j] ^= gexp(logFactor + glog(poly[j]));
      }
    }
  }
  return msg.slice(data.length);
}

function createMatrix(version) {
  const size = VERSION_PARAMS[version].size;
  const matrix = Array.from({ length: size }, () => new Array(size).fill(null));

  function setFinder(startR, startC) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[startR + r][startC + c] = isBorder || isCore ? 1 : 0;
      }
    }
    // Separators
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = startR + r;
        const col = startC + c;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          if (matrix[row][col] === null) matrix[row][col] = 0;
        }
      }
    }
  }

  // 1. Finder patterns at top-left, top-right, bottom-left
  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  // 2. Alignment patterns
  const alignments = VERSION_PARAMS[version].alignments;
  for (const r of alignments) {
    for (const c of alignments) {
      if (matrix[r][c] !== null) continue; // Skip finders
      for (let ar = -2; ar <= 2; ar++) {
        for (let ac = -2; ac <= 2; ac++) {
          const isBorder = Math.abs(ar) === 2 || Math.abs(ac) === 2;
          const isCenter = ar === 0 && ac === 0;
          matrix[r + ar][c + ac] = isBorder || isCenter ? 1 : 0;
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0 ? 1 : 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // 4. Dark module
  matrix[size - 8][8] = 1;

  // 5. Reserve format information areas (temporarily marked as reserved)
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = -1;
    if (matrix[i][8] === null) matrix[i][8] = -1;
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) matrix[8][i] = -1;
    if (matrix[i][8] === null) matrix[i][8] = -1;
  }

  return matrix;
}

// Standard format info for Error Correction Level L and Mask 0
// BCH(15, 5) code for (EC: 01, Mask: 000) ^ 0x5412 = 0x77c4 -> binary 111011111000100
const FORMAT_INFO_L_MASK0 = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];

function applyFormatInfo(matrix) {
  const size = matrix.length;
  const bits = FORMAT_INFO_L_MASK0;

  // Around top-left finder
  const pos1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8],
    [2, 8], [1, 8], [0, 8],
  ];
  for (let i = 0; i < 15; i++) {
    matrix[pos1[i][0]][pos1[i][1]] = bits[i];
  }

  // Split around other finders
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = bits[i];
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][size - 8 + i] = bits[7 + i];
  }
}

function placeDataAndMask(matrix, codewords) {
  const size = matrix.length;
  const bits = [];
  for (const b of codewords) {
    for (let i = 7; i >= 0; i--) {
      bits.push((b >> i) & 1);
    }
  }

  let bitIdx = 0;
  let upwards = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column

    const rows = [];
    for (let r = 0; r < size; r++) rows.push(upwards ? size - 1 - r : r);

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (matrix[r][c] === null || matrix[r][c] === -1) {
          const bit = bitIdx < bits.length ? bits[bitIdx++] : 0;
          // Mask 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0 ? 1 : 0;
          matrix[r][c] = bit ^ mask;
        }
      }
    }
    upwards = !upwards;
  }
}

/**
 * Generates an SVG string representation of a QR code.
 * @param {string} text - The URL or text to encode.
 * @param {object} options - Customization options.
 * @returns {string} Clean SVG markup.
 */
export function generateQrSvg(text, { color = '#011E41', bgColor = '#FFFFFF', margin = 2 } = {}) {
  const version = pickVersion(text.length);
  const codewords = encodeData(text, version);
  const matrix = createMatrix(version);
  placeDataAndMask(matrix, codewords);
  applyFormatInfo(matrix);

  const size = matrix.length;
  const fullSize = size + margin * 2;

  let pathD = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        pathD += `M${c + margin},${r + margin}h1v1h-1z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fullSize} ${fullSize}" shape-rendering="crispEdges" aria-label="QR Code" role="img">
    <rect width="${fullSize}" height="${fullSize}" fill="${bgColor}"/>
    <path d="${pathD.trim()}" fill="${color}"/>
  </svg>`;
}
