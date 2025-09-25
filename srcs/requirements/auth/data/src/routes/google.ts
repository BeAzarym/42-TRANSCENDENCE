import { Static, Type } from "@sinclair/typebox";
import { FastifyPluginAsync, RouteShorthandOptions } from "fastify";
import * as crypto from 'node:crypto'
import { URLSearchParams } from "node:url";
import * as jwt from 'jsonwebtoken'
import DataBase from "database-sdk";

const querySchema = Type.Object({
	code: Type.String(),
	state: Type.String()
})

const callbackOptions: RouteShorthandOptions = {
	schema: {
		querystring: querySchema
	}
}

const db = new DataBase();

function getAvatar(picture_url: string): Promise<File> {
	return new Promise(async (resolve, reject) => {
		const response = await fetch(picture_url);
		if (!response.ok) return reject();
		const blob = await response.blob();
		const file = new File([blob], "profile.png", {type: "image/png"});
		resolve(file);
	})
}

function createOrGetUser(google_user: any): Promise<any> {
	return new Promise(async (resolve, reject) => {
		const userCheck = await db.collection("users").getFirstListItem(`email = '${google_user.email}'`);
		if (userCheck.status === 500) {
			return reject(userCheck);
		}
		if (userCheck.item !== undefined) {
			return resolve(await userCheck);
		}
		/* const newUser = await fetch('http://database:3000/users/createUser', {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				username: google_user.name,
				email: google_user.email,
				password: null
			})
		}) */
		const newUserData = await db.collection("userData").create({});
		if (newUserData.error) {
			return reject(newUserData.error);
		}
		const avatar = await getAvatar(google_user.picture);
		console.log(newUserData);
		const newUser = await db.collection("users").create({
			username: google_user.name,
			email: google_user.email,
			pwd: null,
			userData: newUserData.item.id,
			avatar: avatar
		})
		if (newUser.error) {
			return reject(newUser);
		}
		return resolve(newUser);
	})
}

const oauthStates: Map<string, {timestamp: number}> = new Map();

const routes: FastifyPluginAsync = async (fastify, opts) => {
	fastify.get('/google', async function (request, reply) {
		const state = crypto.randomBytes(32).toString("hex");
		const redirect = `https://${request.hostname}/auth/google/callback`;

		oauthStates.set(state, {timestamp: Date.now()});

		const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
			`client_id=${process.env.GOOGLE_AUTH_CLIENT}&` + 
			`redirect_uri=${encodeURIComponent(redirect)}&` +
			`response_type=code&` +
			`scope=openid%20profile%20email&` +
			`state=${state}`;
		return reply.redirect(googleUrl);
	})

	fastify.get('/google/callback', callbackOptions, async function(request, reply) {
		const {code, state} = request.query as Static<typeof querySchema>;

		if (!state || !oauthStates.has(state)) {
			return reply.badRequest("Invalid state parameter");
		}

		oauthStates.delete(state);

		try {
			const responseToken = await fetch('https://oauth2.googleapis.com/token', {
				method: "POST",
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					client_id: process.env.GOOGLE_AUTH_CLIENT!,
					client_secret: process.env.GOOGLE_AUTH_SECRET!,
					code,
					grant_type: 'authorization_code',
					redirect_uri: `https://${request.hostname}/auth/google/callback`
				})
			});

			const token_data = await responseToken.json() as any;
			if (!token_data.access_token) {
				return reply.badRequest("Failed to obtain access token");
			}

			const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
				headers: {
					'Authorization': `Bearer ${token_data.access_token}`
				}
			});

			const google_user = await userResponse.json();
			const dbUser = await createOrGetUser(google_user);
			
			const baseToken = {userId: dbUser.item.id, username: dbUser.item.username};
			const token = jwt.sign(baseToken, process.env.JWT_SECRET!, {expiresIn: "1h"});

			reply.setCookie("jwt-token", token, {
				httpOnly: true,
				secure: true,
				sameSite: "strict",
				maxAge: 604800,
				path: "/auth",
			})

			reply.redirect("/").send();
		} catch (err) {
			console.log(err);
			return reply.internalServerError();
		}
	})
}

export default routes;