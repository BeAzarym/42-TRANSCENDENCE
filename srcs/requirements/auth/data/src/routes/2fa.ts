import { Static, Type } from "@sinclair/typebox";
import { FastifyPluginAsync, RouteShorthandOptions } from "fastify";
import { pending_logins } from "./login";
import * as jwt from 'jsonwebtoken'
import { checkAuth } from "./checkAuth";
import DataBase from "database-sdk";
import crypto from "crypto"

const bodyOptions = Type.Object({
    code: Type.String({
        minLength: 6,
        maxLength: 12
    })
});

const options: RouteShorthandOptions = {
    schema: {
        body: bodyOptions
    }
}

function decodeKey(secret: string) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    let bits = "";
    for (const char of secret.replace(/=+$/g, '').toUpperCase()) {
        const val = chars.indexOf(char);
        if (val === -1) throw new Error("Invalid base32 char: " + char);
        bits += val.toString(2).padStart(5, "0");
    }

    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }

    return new Uint8Array(bytes);
}

function getBuff() {
    const step = Math.floor(Date.now() / 1000 / 30);
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);

    view.setUint32(4, step, false);
    return new Uint8Array(buffer);
}

async function getHmacSha1(key: Uint8Array, buff: Uint8Array) {
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "HMAC", hash: { name: "SHA-1" } },
        false,
        ["sign"]
    );
    const signed = await crypto.subtle.sign("HMAC", cryptoKey, buff);
    return new Uint8Array(signed);
}

function getCode(hmac: Uint8Array) {
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary = ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
    return binary % Math.pow(10, 6);
}

async function getTTOPCode(tfaSecret: string) {
    const key = decodeKey(tfaSecret);
    const buff = getBuff();

    const hmac = await getHmacSha1(key, buff);
    const code = getCode(hmac);
    return code.toString().padStart(6, "0");
}

const db = new DataBase();

function generateSecret() {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0, val = 0, out = "";
    for (let i = 0; i < bytes.length; i++) {
        val = (val << 8) | bytes[i];
        bits += 8;
        while (bits >= 5) {
            out += chars[(val >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) out += chars[(val << (5 - bits)) & 31];
    return out;
}

function generateReset() {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);

    const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    let out = "";

    for (let i = 0; i < 12; i++) {
        out += chars[bytes[i] & 31];
    }
    return out;
}

const resetBodyOptions = Type.Object({
    reset_code: Type.String({
        maxLength: 12,
        minLength: 12
    })
})

const resetOptions: RouteShorthandOptions = {
    schema: {
        body: resetBodyOptions
    }
}

const route: FastifyPluginAsync = async (fastify, opts) => {
    fastify.post<{ Body: Static<typeof bodyOptions> }>("/2fa", options, async function (request, reply) {
        if (request.cookies["transaction-token"] === undefined) return reply.unauthorized();

        const token = request.cookies["transaction-token"];
        const pending_obj = pending_logins.get(token);
        if (pending_obj === undefined) return reply.badRequest();
        if (pending_obj.time + 300_000 <= Date.now()) {
            pending_logins.delete(token);
            return reply.gone("2FA token expired")
        };

        const expected = await getTTOPCode(pending_obj.user.twoFA);
        const resetCode = pending_obj.user.twoFAReset;
        
        const isValidCode = (request.body.code.length === 6 && expected === request.body.code) ||
                           (request.body.code.length === 12 && resetCode === request.body.code);
        
        if (isValidCode) {
            const jwtBase = { userId: pending_obj.user.id, username: pending_obj.user.username };
            const token = jwt.sign(jwtBase, process.env.JWT_SECRET!, { expiresIn: "1h" });

            pending_logins.delete(token);
            reply.setCookie("jwt-token", token, {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                maxAge: 3600,
                path: "/"
            })
            reply.clearCookie('transaction-token', {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                path: '/'
            })
            delete pending_obj.user.pwd;
            return reply.send({
                type: 'success',
                message: 'User logged in.',
                data: {
                    user: pending_obj.user
                }
            })
        } else {
            return reply.unauthorized("Invalid Code or Recovery Code.");
        }
    });

    fastify.get("/2fa/register", async function (request, reply) {
        if (!await checkAuth(request.cookies["jwt-token"])) {
            return reply.unauthorized();
        }

        const userToken: { userId: string, username: string } = jwt.verify(request.cookies["jwt-token"]!, process.env.JWT_SECRET!) as any;
        const user = await db.collection("users").getOne(userToken.userId);
        if (user.item.twoFA !== null) return reply.conflict();

        const secret = generateSecret();
        const reset = generateReset();
        const updated = await db.collection("users").update(user.item.id, {
            twoFA: secret,
            twoFAReset: reset
        })

        if (updated.error) {
            return reply.internalServerError();
        }

        return reply.send({
            type: "success",
            message: "User registered to 2FA",
            data: {
                secret: updated.item.twoFA,
                reset: updated.item.twoFAReset
            }
        });
    })

    fastify.post<{ Body: Static<typeof resetBodyOptions> }>("/2fa/reset", resetOptions, async function (request, reply) {
        if (request.cookies["transaction-token"] === undefined) return reply.unauthorized();
        
		const token = request.cookies["transaction-token"];
        const pending_obj = pending_logins.get(token);
        if (pending_obj === undefined) return reply.badRequest();
        if (pending_obj.time + 300_000 <= Date.now()) {
            pending_logins.delete(token);
            return reply.gone("2FA token expired")
        };
		
        const user = pending_obj.user;

        if (user.twoFAReset !== request.body.reset_code) return reply.forbidden();

        const secret = generateSecret();
        const reset = generateReset();
        const updated = await db.collection("users").update(user.id, {
            twoFA: secret,
            twoFAReset: reset
        })

        if (updated.error) {
            return reply.internalServerError();
        }

        return reply.send({
            type: "success",
            message: "User registered to 2FA",
            data: {
                secret: updated.item.twoFA,
                reset: updated.item.twoFAReset
            }
        });
    })

    fastify.get("/2fa/status", async function (request, reply) {
        if (!await checkAuth(request.cookies["jwt-token"])) {
            return reply.unauthorized();
        }
        
        try {
            const userToken: { userId: string, username: string } = jwt.verify(request.cookies["jwt-token"]!, process.env.JWT_SECRET!) as any;
            const user = await db.collection("users").getOne(userToken.userId);
            
            if (user.error) {
                return reply.internalServerError("User not found");
            }
            
            const is2FAEnabled = user.item.twoFA !== null;
            
            return reply.send({
                type: "success",
                data: {
                    enabled: is2FAEnabled
                }
            });
        } catch (error) {
            console.error("[ERROR] 2FA Status check:", error);
            return reply.internalServerError("Internal server error");
        }
    });

    fastify.delete("/2fa/disable", async function (request, reply) {
        if (!await checkAuth(request.cookies["jwt-token"])) {
            return reply.unauthorized();
        }
        
        try {
            const userToken: { userId: string, username: string } = jwt.verify(request.cookies["jwt-token"]!, process.env.JWT_SECRET!) as any;
            const user = await db.collection("users").getOne(userToken.userId);
            
            if (user.error) {
                return reply.internalServerError("User not found");
            }
            
            if (user.item.twoFA === null) {
                return reply.badRequest("2FA is not enabled");
            }
            
            const updated = await db.collection("users").update(user.item.id, {
                twoFA: null,
                twoFAReset: null
            });
            
            if (updated.error) {
                return reply.internalServerError("Failed to disable 2FA");
            }
            
            return reply.send({
                type: "success",
                message: "2FA disabled successfully"
            });
        } catch (error) {
            console.error("[ERROR] 2FA Disable:", error);
            return reply.internalServerError("Internal server error");
        }
    });
}

export default route;