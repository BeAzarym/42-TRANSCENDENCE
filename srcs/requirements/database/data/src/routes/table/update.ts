import { FastifyPluginAsync } from "fastify";
import { db } from "../../database";
import * as crypto from 'crypto'
import * as fs from 'fs';
import { pipeline } from "stream/promises";
import * as path from "path"
import { Multipart } from "@fastify/multipart";
import { rename, copyFile, unlink, rm } from "fs/promises";

function __update(params: any, body: any): Promise<any> {
	return new Promise((resolve, reject) => {
		for (const key in body) {
			if (typeof body[key] === "object" && body[key] !== null) {
				body[key] = JSON.stringify(body[key]);
			}
			if (body[key] === null) {
				body[key] = "NULL";
			} else {
				body[key] = `'${body[key]}'`;
			}
		}
		const updates = Object.entries(body).map((entry) => { return `${entry[0]} = ${entry[1]}` }).join(", ");
		db.run(`UPDATE ${params.tableName} SET ${updates} WHERE id = ?`, [params.id], function (this, err) {
			if (err) return reject(err);
			//console.log(`SELECT * FROM ${params.tableName} WHERE id = ${params.id}`)
			db.get(`SELECT * FROM ${params.tableName} WHERE id = ?`, [params.id], (err, val) => {
				if (err) return reject(err);
				return resolve(val);
			})
		})
	})
}

function __getUniqueName(filename: string): string {
	const dotindex = filename.lastIndexOf(".");
	const retval = filename.slice(0, dotindex) + crypto.randomBytes(5).toString("hex") + filename.slice(dotindex);
	return retval;
}

async function __formToJson(form: AsyncIterableIterator<Multipart>, transactionId: string): Promise<any> {
	const tempFileStorage = path.join("/var/www/database/tempFiles/", transactionId);
	fs.mkdirSync(tempFileStorage, { recursive: true });


	const jsonObj: { [key: string]: any } = {};
	const fileList: Map<string, { path: string, column: string, name: string }> = new Map;
	for await (const part of form) {
		console.log("new part in form: ");
		if (part.type === 'file') {
			const unique = __getUniqueName(part.filename);
			const filePath = path.join(tempFileStorage, unique);

			await pipeline(part.file, fs.createWriteStream(filePath));

			jsonObj[part.fieldname] = unique;
			fileList.set(jsonObj[part.fieldname], { path: filePath, column: part.fieldname, name: unique });
			// part.file is a stream for the uploaded file
		} else if (part.type === 'field') {
			console.log("	part is field:");
			console.log("		name: " + part.fieldname);
			console.log("		value: " + part.value);
			if (part.fieldname === "@jsonPayload") {
				const tempObj = JSON.parse(part.value as string);
				for (const onlyVal in tempObj) {
					jsonObj[onlyVal] = tempObj[onlyVal];
				}
			} else {
				jsonObj[part.fieldname] = part.value;
			}
		}
		console.log("finished reading part");
	}
	console.log("finished reading data");
	return { jsonObj, fileList };
}

function __getRecord(params: any): Promise<any> {
	return new Promise((resolve, reject) => {
		db.get(`SELECT * FROM ${params.tableName} WHERE id = ?`, [params.id], (err, val: any) => {
			if (err) return reject(err);
			delete val.pwd;
			resolve(val);
		})
	})
}

async function deleteTempFolder(transactionId: string) {
	const tempFileStorage = path.join("/var/www/database/tempFiles/", transactionId);

	await rm(tempFileStorage, { recursive: true, force: true });
}

async function __updateFiles(files: Map<string, { path: string, column: string, name: string }>, params: any, olddb: any, transactionId: string): Promise<void> {
	const pathprefix = "/var/www/database/files";
	const recordFolder = `${pathprefix}/${params.tableName}/${params.id}`;

	for (const [key, val] of files.entries()) {
		try {
			console.log(`[DEBUG] Processing file: ${key} for column: ${val.column}`);

			const ogFile = olddb[val.column];
			if (fs.existsSync(`${recordFolder}/${ogFile}`)) {
				fs.unlinkSync(`${recordFolder}/${ogFile}`);
				console.log(`[DEBUG] Deleted old file: ${recordFolder}/${ogFile}`);
			}

			fs.mkdirSync(recordFolder, { recursive: true });
			console.log(`[DEBUG] Created directory: ${recordFolder}`);

			const finalPath = path.join(recordFolder, val.name);

			try {
				await rename(val.path, finalPath);
			} catch (err) {
				if ((err as any).code === "EXDEV") {
					const tmpName = `${val.name}.tmppart`;
					const tmpPath = path.join(recordFolder, tmpName);
					await copyFile(val.path, tmpPath, 0);
					await rename(tmpPath, finalPath);
					await unlink(val.path);
				} else {
					throw err;
				}
			}

			/* // Lire le stream de façon asynchrone
			const chunks: Buffer[] = [];
			for await (const chunk of val.file) {
				chunks.push(chunk);
			}
			const buffer = Buffer.concat(chunks); */

			/* fs.writeFileSync(`${recordFolder}/${key}`, buffer);
			console.log(`[DEBUG] File written successfully: ${recordFolder}/${key}, size: ${buffer.length} bytes`); */

		} catch (err) {
			console.error(`[ERROR] Failed to process file ${key}:`, err);
			throw err;
		}
	}
	deleteTempFolder(transactionId);
}

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {

	fastify.patch("/:tableName/update/:id", async (request, reject) => {
		const transactionId = crypto.randomBytes(16).toString("base64url");
		try {
			console.log(`[DEBUG] Starting database update for ${(request.params as any).tableName}/${(request.params as any).id}`);


			let { jsonObj, fileList } = await __formToJson(await request.parts(), transactionId);
			jsonObj.updatedAt = Date.now();
			if (jsonObj.id) {
				delete jsonObj.id;
			}

			console.log(`[DEBUG] Processing ${fileList.size} files`);

			//console.log(Object.entries(request.body as any).map((entry) => {return `${entry[0]} = '${entry[1]}'`}).join(", "));
			const olddb = await __getRecord(request.params);

			const ret = await __update(request.params, jsonObj);

			console.log(`[DEBUG] Database updated, now processing files...`);
			await __updateFiles(fileList, request.params, olddb, transactionId);
			console.log(`[DEBUG] Files processed successfully`);

			return ret;
		} catch (error) {
			console.error(`[ERROR] Database update failed:`, error);
			deleteTempFolder(transactionId);
			throw error;
		}
	})
}

export default route;