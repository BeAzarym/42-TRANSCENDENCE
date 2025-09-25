import { FastifyPluginAsync } from "fastify";
import * as crypto from "crypto"
import { db } from "../../database";
import * as fs from 'fs';
import { pipeline } from "stream/promises";
import * as path from "path"
import { Multipart } from "@fastify/multipart";
import { copyFile, rename, rm, unlink } from "fs/promises";

function __create(table: string, body: any): Promise<any> {
	return new Promise((resolve, reject) => {
		const id = body.id
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
		db.run(`INSERT INTO ${table} (${Object.keys(body).join(", ")}) VALUES (${Object.values(body).join(", ")})`, function (this, err) {
			if (err) return reject(err);
			db.get(`SELECT * FROM ${table} WHERE id = ?`, [id], (err, val) => {
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

async function __createFiles(files: Map<string, { path: string, column: string, name: string }>, table: string, id: string, transactionId: string): Promise<void> {
	const pathprefix = "/var/www/database/files";
	const recordFolder = `${pathprefix}/${table}/${id}`;

	for (const [key, val] of files.entries()) {
		fs.mkdirSync(recordFolder, { recursive: true });

		if (!key) continue;

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
	}

	deleteTempFolder(transactionId);

	/* files.forEach((val, key) => {
		console.log("creating file at path " + `${pathprefix}/${table}/${id}/${key}`);
		fs.mkdirSync(recordFolder, { recursive: true });
		//fs.writeFileSync(`${recordFolder}/${key}`, val.read());
	}) */
	/* for (const key in files) {
		console.log("creating file at path " + `${pathprefix}/${table}/${id}/${key}`);
		fs.writeFileSync(`${pathprefix}/${table}/${id}/${key}`, files.get(key)?.read());
	} */
}

async function deleteTempFolder(transactionId: string) {
	const tempFileStorage = path.join("/var/www/database/tempFiles/", transactionId);

	await rm(tempFileStorage, { recursive: true, force: true });
}

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post("/:tableName/create", async function (request, reply) {
		const transactionId = crypto.randomBytes(16).toString("base64url");

		//console.log(await request.file());

		try {
			var { jsonObj, fileList } = await __formToJson(request.parts(), transactionId);
			jsonObj = Object.assign({ id: crypto.randomBytes(10).toString("hex") }, jsonObj);
			jsonObj.createdAt = Date.now();
			jsonObj.updatedAt = Date.now();
			console.log(jsonObj);

			const table = (request.params as any).tableName as string
			const ret = await __create(table, jsonObj);
			console.log(ret);

			await __createFiles(fileList, table, ret.id, transactionId);
			return ret;
		} catch (err) {
			console.error(`[ERROR] Database update failed:`, err);
			deleteTempFolder(transactionId);
			throw err;
		}
	})
}

export default route