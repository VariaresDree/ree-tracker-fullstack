// src/features/backup/storedZip.js
//
// A plain ZIP with no compression: what's in a backup is mostly PDFs and encrypted
// bytes, which don't compress. Written piece by piece into Blobs, and read by slicing
// the file, so a large backup never has to fit in memory, and a preview reads only its
// index. fflate's unzip reads from the front of a stream, which would mean the whole
// file every time. The result opens in any ZIP tool.

export class BackupError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BackupError';
    this.code = code;
  }
}

const NOT_A_BACKUP = () => new BackupError('not-backup', 'That isn’t a backup from this app.');
const DAMAGED = () => new BackupError('corrupt', 'This backup file is damaged, so it can’t be restored. Part of it didn’t read back correctly.');

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const END_SIG = 0x06054b50;
const UTF8_NAMES = 0x0800;
const MAX_ZIP_BYTES = 0xffffffff;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class ZipWriter {
  #parts = [];
  #central = [];
  #offset = 0;

  /** Add one entry. The bytes go into a Blob at once, so the browser can hold them on disk. */
  add(name, bytes) {
    const nameBytes = encoder.encode(name);
    const crc = crc32(bytes);
    const size = bytes.length;
    if (this.#offset + 30 + nameBytes.length + size > MAX_ZIP_BYTES) {
      throw new BackupError('too-big', 'This backup would be over 4 GB, which is more than one file can hold. Leave out saved handouts, or remove some files.');
    }
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, LOCAL_SIG, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, UTF8_NAMES, true);
    local.setUint16(8, 0, true); // stored
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true);
    local.setUint32(22, size, true);
    local.setUint16(26, nameBytes.length, true);
    this.#parts.push(new Blob([local.buffer, nameBytes, bytes]));
    this.#central.push({ nameBytes, crc, size, offset: this.#offset });
    this.#offset += 30 + nameBytes.length + size;
  }

  finish() {
    const pieces = [];
    let centralSize = 0;
    for (const { nameBytes, crc, size, offset } of this.#central) {
      const head = new DataView(new ArrayBuffer(46));
      head.setUint32(0, CENTRAL_SIG, true);
      head.setUint16(4, 20, true);
      head.setUint16(6, 20, true);
      head.setUint16(8, UTF8_NAMES, true);
      head.setUint32(16, crc, true);
      head.setUint32(20, size, true);
      head.setUint32(24, size, true);
      head.setUint16(28, nameBytes.length, true);
      head.setUint32(42, offset, true);
      pieces.push(head.buffer, nameBytes);
      centralSize += 46 + nameBytes.length;
    }
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, END_SIG, true);
    end.setUint16(8, this.#central.length, true);
    end.setUint16(10, this.#central.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, this.#offset, true);
    return new Blob([...this.#parts, ...pieces, end.buffer], { type: 'application/octet-stream' });
  }
}

const viewOf = async (blob) => new DataView(await blob.arrayBuffer());

/** Open a ZIP from a File. Reads only its directory; `read` fetches one entry and checks it. */
export async function readZip(file) {
  const tailStart = Math.max(0, file.size - 65557);
  const tail = await viewOf(file.slice(tailStart));
  let at = -1;
  for (let i = tail.byteLength - 22; i >= 0; i -= 1) {
    if (tail.getUint32(i, true) === END_SIG) { at = i; break; }
  }
  if (at < 0) throw NOT_A_BACKUP();
  const count = tail.getUint16(at + 10, true);
  const centralSize = tail.getUint32(at + 12, true);
  const centralStart = tail.getUint32(at + 16, true);
  if (centralStart + centralSize > file.size) throw NOT_A_BACKUP();

  const central = await viewOf(file.slice(centralStart, centralStart + centralSize));
  const entries = new Map();
  let p = 0;
  for (let n = 0; n < count; n += 1) {
    if (p + 46 > central.byteLength || central.getUint32(p, true) !== CENTRAL_SIG) throw NOT_A_BACKUP();
    const nameLength = central.getUint16(p + 28, true);
    const extra = central.getUint16(p + 30, true);
    const comment = central.getUint16(p + 32, true);
    const name = decoder.decode(new Uint8Array(central.buffer, p + 46, nameLength));
    entries.set(name, {
      method: central.getUint16(p + 10, true),
      crc: central.getUint32(p + 16, true),
      size: central.getUint32(p + 24, true),
      offset: central.getUint32(p + 42, true),
    });
    p += 46 + nameLength + extra + comment;
  }

  return {
    has: (name) => entries.has(name),
    names: () => [...entries.keys()],
    async read(name) {
      const entry = entries.get(name);
      if (!entry) throw DAMAGED();
      // Anything this app didn't write: a normal ZIP someone renamed, say.
      if (entry.method !== 0) throw NOT_A_BACKUP();
      const head = await viewOf(file.slice(entry.offset, entry.offset + 30));
      if (head.byteLength < 30 || head.getUint32(0, true) !== LOCAL_SIG) throw DAMAGED();
      const start = entry.offset + 30 + head.getUint16(26, true) + head.getUint16(28, true);
      const bytes = new Uint8Array(await file.slice(start, start + entry.size).arrayBuffer());
      if (bytes.length !== entry.size || crc32(bytes) !== entry.crc) throw DAMAGED();
      return bytes;
    },
  };
}
