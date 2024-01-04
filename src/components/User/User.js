import { generateKeyPairSync, createSign } from "crypto";
import PeerConnection from "../../peer";

const transactionManagerId =
	"5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9";

export const createSignature = (utxo) => {
	const { privateKey, publicKey } = generateKeyPairSync("ec", {
		namedCurve: "sect239k1",
	});

	const publicKeyHex = publicKey
		.export({ type: "spki", format: "der" })
		.toString("hex");

	const utxoString =
		utxo.transactionId + utxo.outputIndex + utxo.publicKey + utxo.amount;

	const sign = createSign("SHA256").update(utxoString).end();
	const signature = sign.sign(privateKey, "hex");

	return {
		signature,
		publicKeyHex,
	};
};

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

	PeerConnection.onConnectionReceiveData(senderId, (transactionData) => {
		if (senderId === transactionManagerId) {
			console.log("Transaction manager has sent data");

			// update merkle patricia trie

			setTimeout(async () => {
				await PeerConnection.sendConnection(transactionManagerId, {
					type: "payment updated",
					success: true,
				});
				console.log("Payment received & ledger updated");
			}, 1000);
		}
	});
};
