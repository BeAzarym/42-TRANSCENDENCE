import "ws";

declare module "ws" {
	interface WebSocket {
		roomId?: string
	}
}