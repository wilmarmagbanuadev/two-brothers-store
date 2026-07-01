import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const outputPath = resolve("public", "admin-sw-version.js");
const deploymentVersion = `${Date.now()}-${randomUUID()}`;
const source = `self.__TWO_BROTHERS_ADMIN_BUILD__ = ${JSON.stringify(deploymentVersion)};\n`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, source, "utf8");

console.log(`Prepared admin PWA deployment ${deploymentVersion}`);
