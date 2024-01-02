import { Peer } from "peerjs";

let peer;
let connectionMap = new Map();

const PeerConnection = {
	getPeer: () => peer,
	startPeerSession: (peerId) =>
		new Promise((resolve, reject) => {
			try {
				peer = new Peer(peerId);
				peer.on("open", (id) => {
					console.log("My ID: " + id);
					resolve(id);
				}).on("error", (err) => {
					console.log(err);
				});
			} catch (err) {
				console.log(err);
				reject(err);
			}
		}),
	closePeerSession: () =>
		new Promise((resolve, reject) => {
			try {
				if (peer) {
					peer.destroy();
					peer = undefined;
				}
				resolve();
			} catch (err) {
				console.log(err);
				reject(err);
			}
		}),
	connectPeer: (id) =>
		new Promise((resolve, reject) => {
			if (!peer) {
				reject(new Error("Peer doesn't start yet"));
				return;
			}
			if (connectionMap.has(id)) {
				reject(new Error("Connection existed"));
				return;
			}
			try {
				let conn = peer.connect(id, { reliable: true });
				if (!conn) {
					reject(new Error("Connection can't be established"));
				} else {
					conn.on("open", function () {
						console.log("Connect to: " + id);
						connectionMap.set(id, conn);
						resolve();
					}).on("error", function (err) {
						console.log(err);
						reject(err);
					});
				}
			} catch (err) {
				reject(err);
			}
		}),
	onIncomingConnection: (callback) => {
		peer?.on("connection", function (conn) {
			console.log("Incoming connection: " + conn.peer);
			connectionMap.set(conn.peer, conn);
			callback(conn);
		});
	},
	onConnectionDisconnect: (id, callback) => {
		if (!peer) {
			throw new Error("Peer doesn't start yet");
		}
		if (!connectionMap.has(id)) {
			throw new Error("Connection didn't exist");
		}
		let conn = connectionMap.get(id);
		if (conn) {
			conn.on("close", function () {
				console.log("Connection closed: " + id);
				connectionMap.delete(id);
				callback();
			});
		}
	},
	sendConnection: (id, data) =>
		new Promise((resolve, reject) => {
			if (!connectionMap.has(id)) {
				reject(new Error("Connection didn't exist"));
			}
			try {
				let conn = connectionMap.get(id);
				if (conn) {
					conn.send(data);
				}
			} catch (err) {
				reject(err);
			}
			resolve();
		}),
	onConnectionReceiveData: (id, callback) => {
		if (!peer) {
			throw new Error("Peer doesn't start yet");
		}
		if (!connectionMap.has(id)) {
			throw new Error("Connection didn't exist");
		}
		let conn = connectionMap.get(id);
		if (conn) {
			conn.on("data", function (receivedData) {
				console.log("Receiving data from " + id);
				let data = receivedData;
				callback(data);
			});
		}
	},
};

export default PeerConnection;
