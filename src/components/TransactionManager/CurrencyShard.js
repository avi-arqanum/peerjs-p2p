import { createPublicKey, createVerify, createHash } from "crypto";

import PeerConnection from "../../peer";
import { veto } from "./TransactionManager";

const utxoHash = (utxo) => {
	const utxoString =
		utxo.transactionId + utxo.outputIndex + utxo.publicKey + utxo.amount;

	return createHash("SHA256").update(utxoString).digest("hex");
};

const verifySignature = (utxo, signature) => {
	const publicKey = createPublicKey({
		key: Buffer.from(utxo.publicKey, "hex"),
		type: "spki",
		format: "der",
	});

	const utxoString =
		utxo.transactionId + utxo.outputIndex + utxo.publicKey + utxo.amount;

	const verify = createVerify("SHA256").update(utxoString).end();
	return verify.verify(publicKey, signature, "hex");
};

const localValidate = (transaction) => {
	for (let i = 0; i < transaction.inputUTXOs.length; i++) {
		const utxo = transaction.inputUTXOs[i];
		const signature = transaction.digitalSignatures[i];

		if (!verifySignature(utxo, signature)) {
			return false;
		}
	}

	return true;
};

const compactTransactions = new Map();
export const compact = {
	getTransaction: (transactionId) => {
		compactTransactions.get(transactionId);
	},
	addTransaction: (transactionData, transactionId) => {
		if (compactTransactions.has(transactionId)) {
			console.error(
				"TransactionId already exists in compactTransactions"
			);
			return;
		}

		const inputHashes = [];
		for (let inputUTXO of transactionData.inputUTXOs) {
			inputHashes.push(utxoHash(inputUTXO));
		}

		const outputHashes = [];
		for (
			let index = 0;
			index < transactionData.outputUTXOs.length;
			index += 1
		) {
			const outputUTXO = {
				...transactionData.outputUTXOs[index],
				transactionId,
				outputIndex: index,
			};
			outputHashes.push(utxoHash(outputUTXO));
		}

		compactTransactions.set(transactionId, {
			transactionId,
			inputHashes,
			outputHashes,
		});
	},
	deleteTransaction: (transactionId) => {
		compactTransactions.delete(transactionId);
	},
};

export const transactionCoordinatorId = "";

export const handleCurrencyShardValidation = async (
	transactionData,
	transactionId
) => {
	if (localValidate(transactionData)) {
		compact.addTransaction(transactionData, transactionId);

		const compactTransaction = {
			type: "transaction validation",
			...compact.getTransaction(transactionId),
		};

		await PeerConnection.connectPeer(transactionCoordinatorId);

		await PeerConnection.sendConnection(
			transactionCoordinatorId,
			compactTransaction
		);

		PeerConnection.onConnectionReceiveData(
			transactionCoordinatorId,
			(data) => {
				switch (data.type) {
					case "validation result":
						{
							veto.updateVotes(transactionId, data.success);
						}
						break;
				}
			}
		);
	} else {
		veto.updateVotes(transactionId, false);
	}

	console.log("Currency shard validation completed");
};

export const handleCurrencyShardsLedgerUpdate = async (transactionId) => {
	const shardLedgerUpdatePromise = new Promise(async (resolve) => {
		await PeerConnection.sendConnection(transactionCoordinatorId, {
			type: "transaction validated",
			...compact.getTransaction(transactionId),
		});

		PeerConnection.onConnectionReceiveData(
			transactionCoordinatorId,
			(data) => {
				if (data.type === "ledger updated" && data.success === true) {
					console.log("Currency shard has updated it's ledger!");
					resolve();
				}
			}
		);
	});

	await shardLedgerUpdatePromise;
};
