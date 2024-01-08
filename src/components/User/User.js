import { ec as EC } from "elliptic";
import PeerConnection from "../../peer";
import nodeIds from "../../Ids";

function generateKeyPair(seedString) {
	const ec = new EC("secp256k1");

	const encoder = new TextEncoder();
	const seed = encoder.encode(seedString);

	const keyPair = ec.keyFromPrivate(seed);

	// const publicKeyHex = keyPair.getPublic().encode("hex");

	return keyPair;
}

export function createSignature(utxo, seedString) {
	const keyPair = generateKeyPair(seedString);

	const utxoString =
		utxo.transactionId + utxo.outputIndex + utxo.publicKey + utxo.amount;

	const signature = keyPair.sign(utxoString).toDER("hex");

	return signature;
}

const transactionManagerId = nodeIds["transaction manager"].id;

const handleTransactionResult = (transactionResult) => {
	if (transactionResult.success) {
		console.log("Transaction is valid!");

		setTimeout(async () => {
			await PeerConnection.sendConnection(transactionManagerId, {
				type: "payment updated",
				success: true,
			});
			console.log("Payment update sent to transaction manager");
		}, 1000);
	} else {
		console.log("Transaction manager disapproved the transaction");
	}
};

export const handleTransaction = async (transactionData) => {
	try {
		await PeerConnection.connectPeer(transactionManagerId);
		console.log("Connection with transaction manager established");

		await PeerConnection.sendConnection(
			transactionManagerId,
			transactionData
		);
		console.log("Transaction is sent for validation");

		PeerConnection.onConnectionReceiveData(
			transactionManagerId,
			handleTransactionResult
		);
	} catch (error) {
		console.log("Connection error:", error);
	}
};

export const handleIncomingConnection = (incomingConnection) => {
	const senderId = incomingConnection.peer;

	PeerConnection.onConnectionReceiveData(
		senderId,
		async (transactionData) => {
			if (senderId === transactionManagerId) {
				console.log("Transaction manager has sent data");

				// update merkle patricia trie

				await PeerConnection.sendConnection(transactionManagerId, {
					type: "payment updated",
					success: true,
				});
				console.log("Payment received & ledger updated");
			}
		}
	);
};
