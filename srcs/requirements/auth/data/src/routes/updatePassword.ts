import { Static, Type } from "@sinclair/typebox";
import { FastifyPluginAsync, RouteShorthandOptions } from "fastify";
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import DataBase from "database-sdk";
import { checkAuth } from "./checkAuth";

const Data = Type.Object({
	current: Type.String(),
	newPassword: Type.String()
});

const options: RouteShorthandOptions = {
	schema: {
		body: Data
	}
};

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => { 
	fastify.patch < {Body: Static<typeof Data>}>("/updatePassword", options, async function (request, reply) {
		try {
			if (!await checkAuth(request.cookies["jwt-token"]!))
				return reply.unauthorized();
			
			const userToken: { userId: string, username: string } = jwt.verify(request.cookies["jwt-token"]!, process.env.JWT_SECRET!) as any;

			const db = new DataBase();
			const user = await db.collection("users").getOne(userToken.userId);

			if (user.error)
				return reply.internalServerError("User not found.");

			if (!bcrypt.compareSync(request.body.current, user.item.pwd))
				return reply.badRequest("Invalid password");

			const newHash = bcrypt.hashSync(request.body.newPassword, 10);
			
			const updateResult = await db.collection("users").update(userToken.userId, {
				pwd: newHash
			});

			if (updateResult.error)
				return reply.internalServerError("Password update failled.");

			return reply.send({
				type: "success",
				message: "Password updated successfully"
			});
		} catch (error) {
			console.error("[ERROR] Update password Service :", error);
			return reply.internalServerError("Internal server error");
		}	
	})
}

export default route;