import { ec as EC } from "elliptic";
import { SHA256 } from "crypto-js";

import PeerConnection from "../../peer";
import { veto } from "./TransactionManager";
import nodeIds from "../../Ids";

const utxoHash = (utxo) => {
	const utxoString =
		utxo.transactionId + utxo.outputIndex + utxo.publicKey + utxo.amount;

	return SHA256(utxoString).toString();
};

function verifySignature(utxo, signature) {
	const ec = new EC("secp256k1");

	const utxoString =
		utxo.transactionId + utxo.outputIndex + utxo.publicKey + utxo.amount;

	const key = ec.keyFromPublic(utxo.publicKey, "hex");

	return key.verify(utxoString, signature);
}

const localValidate = (transaction) => {
	for (let i = 0; i < transaction.inputUtxos.length; i++) {
		const utxo = transaction.inputUtxos[i];
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
		return compactTransactions.get(transactionId);
	},
	addTransaction: (transactionData, transactionId) => {
		if (compactTransactions.has(transactionId)) {
			console.error(
				"TransactionId already exists in compactTransactions"
			);
			return;
		}

		const inputHashes = [];
		for (let inputUtxo of transactionData.inputUtxos) {
			inputHashes.push(utxoHash(inputUtxo));
		}

		const outputHashes = [];
		for (
			let index = 0;
			index < transactionData.outputUtxos.length;
			index += 1
		) {
			const outputUtxo = {
				...transactionData.outputUtxos[index],
				transactionId,
				outputIndex: index,
			};
			outputHashes.push(utxoHash(outputUtxo));
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

export const transactionCoordinatorId = nodeIds["transaction coordinator"].id;

export const handleCurrencyShardValidation = async (
	transactionData,
	transactionId
) => {
	if (localValidate(transactionData)) {
		console.log("local validation successful");
		compact.addTransaction(transactionData, transactionId);

		var compactTransaction = compact.getTransaction(transactionId);
		compactTransaction.type = "transaction validation";

		const shardValidationCompletePromise = new Promise(async (resolve) => {
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
								console.log(
									"shards layer validation result",
									data.success ? "valid" : "invalid"
								);

								resolve();
							}
							break;
					}
				}
			);
		});

		await shardValidationCompletePromise;
	} else {
		veto.updateVotes(transactionId, false);
	}

	console.log("Currency shard validation completed");
};

export const handleCurrencyShardsLedgerUpdate = async (transactionId) => {
	const shardLedgerUpdatePromise = new Promise(async (resolve) => {
		await PeerConnection.sendConnection(transactionCoordinatorId, {
			...compact.getTransaction(transactionId),
			type: "transaction validated",
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
