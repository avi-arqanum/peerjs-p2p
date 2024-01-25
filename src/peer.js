import { Peer } from "peerjs";

let peer;
let connectionMap = new Map();

const IdMapping = {
	"046eca335d9645307db441656ef4e65b4bfc579b27452bebc19bd870aa1118e5c3d50123b57a7a0710592f579074b875a03a496a3a3bf8ec34498a2f7805a08668":
		"transaction manager",
	"04f2dac991cc4ce4b9ea44887e5c7c0bce58c80074ab9d4dbaeb28531b7739f530e0dedc9b3b2f8dad4da1f32dec2531df9eb5fbeb0598e4fd1a117dba703a3c37":
		"recipient",
	"0429757774cc6f3be1d5f1774aefa8f02e50bc64404230e7a67e8fde79bd559a9ac39d07337ddc9268a0eba45a7a41876d151b423eac4033b550bd28c17c470134":
		"validator",
	"04463b3d9f662621fb1b4be8fbbe2520125a216cdfc9dae3debcba4850c690d45b5ed430d78c296c3543114306dd8622d7c622e27c970a1de31cb377b01af7307e":
		"transaction coordinator",
	"042b22efda32491a9e0294339ca3da761f7d36cfc8814c1b29ca731921025ff6957ed520327080a9fa4c16662fc134fadcc7048846d46ade0030b83fd19adc87cd":
		"utxo shard",
	"04f16f804244e46e2a09232d4aff3b59976b98fac14328a2d1a32496b49998f247cedabd9b82203f7e13d206fcdf4e33d92a6c53c26e5cce26d6579962c4e31df6":
		"sender",
	"044fdcb8fa639cee441c8331fd47a2e5ff3447be24500ca7a5249971067c1d506b25a5208b674bfd4cae4d91eb555010aa422cc82409d5079690f3743d00fdaefb":
		"global",
};

const PeerConnection = {
	getPeer: () => peer,
	startPeerSession: (peerId) =>
		new Promise((resolve, reject) => {
			try {
				peer = new Peer(peerId);
				peer.on("open", (id) => {
					console.log("My ID: " + IdMapping[id]);
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
						console.log("Connect to: " + IdMapping[id]);
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
			console.log("Incoming connection: " + IdMapping[conn.peer]);
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
				console.log("Connection closed: " + IdMapping[id]);
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
				console.log("Receiving data from " + IdMapping[id]);
				let data = receivedData;
				callback(data);
			});
		}
	},
};

export default PeerConnection;
