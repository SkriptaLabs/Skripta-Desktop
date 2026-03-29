function hashToPath(hash: string, depth = 5, segmentLength = 2): string {
    if (!/^[a-f0-9]+$/i.test(hash)) {
        throw new Error("Invalid hash format");
    }

    const parts: string[] = [];

    for (let i = 0; i < depth; i++) {
        const start = i * segmentLength;
        const end = start + segmentLength;
        parts.push(hash.slice(start, end));
    }

    const rest = hash.slice(depth * segmentLength);

    return [...parts, rest].join("/");
}

import * as path from "path";

function hashToFsPath(hash: string, baseDir: string): string {
    const relativePath = hashToPath(hash);
    return path.join(baseDir, relativePath);
}

import * as fs from "fs";

function ensurePath(filePath: string) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
}

export function storeFile(baseDir: string, hash: string, data: Buffer) {
    const filePath = hashToFsPath(hash, baseDir);

    ensurePath(filePath);

    fs.writeFileSync(filePath, data);
}

export function loadFile(baseDir: string, hash: string): Buffer {
    const filePath = hashToFsPath(hash, baseDir);

    if (!fs.existsSync(filePath)) {
        throw new Error("File not found");
    }

    return fs.readFileSync(filePath);
}

export function deleteFile(baseDir: string, hash: string) {
    const filePath = hashToFsPath(hash, baseDir);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}