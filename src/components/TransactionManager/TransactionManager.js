import {
	handleValidatorsValidation,
	handleValidatorsLedgerUpdate,
} from "./Validator";

import {
	handleCurrencyShardValidation,
	handleCurrencyShardsLedgerUpdate,
} from "./CurrencyShard";

import PeerConnection from "../../peer";

const vetoVotes = new Map();
export const veto = {
	getVotes: (transactionId) => {
		return vetoVotes.get(transactionId);
	},
	updateVotes: (transactionId, success) => {
		if (vetoVotes.has(transactionId)) {
			const votes = vetoVotes.get(transactionId);

			votes.totalVotes += 1;
			votes.valid += success ? 1 : 0;

			vetoVotes.set(transactionId, votes);
		} else {
			const valid = success ? 1 : 0;
			vetoVotes.set(transactionId, {
				totalVotes: 1,
				valid: valid,
			});
		}
	},
	deleteVotes: (transactionId) => {
		vetoVotes.delete(transactionId);
	},
};

export const handleValidation = async (transactionData, transactionId) => {
	var validationPromises = [];

	validationPromises.push(
		handleValidatorsValidation(transactionData, transactionId)
	);

	validationPromises.push(
		handleCurrencyShardValidation(transactionData, transactionId)
	);

	await Promise.all(validationPromises);

	const { totalVotes, valid } = veto.getVotes(transactionId);

	if (totalVotes !== 2) {
		throw new Error("Something went wrong!");
	}

	if (valid === 2) {
		return true;
	}

	return false;
};

export const handleValidTransaction = async (
	senderId,
	transactionData,
	transactionId
) => {
	const layerUpdatePromises = [];

	layerUpdatePromises.push(
		handleUsersLedgerUpdate(senderId, transactionData, transactionId)
	);

	layerUpdatePromises.push(
		handleValidatorsLedgerUpdate(transactionId, transactionData)
	);

	layerUpdatePromises.push(handleCurrencyShardsLedgerUpdate(transactionId));

	await Promise.all(layerUpdatePromises);
	console.log("All layers have updated their ledger!");
};

export const handleUsersLedgerUpdate = async (
	senderId,
	transactionData,
	transactionId
) => {
	const outputUTXOs = transactionData.outputUTXOs.map((output, index) => ({
		...output,
		transactionId: transactionId,
		outputIndex: index,
	}));

	const changeUTXOs = outputUTXOs.filter(
		(outputUTXO) => outputUTXO.publicKey === senderId
	);

	const transactionResult = {
		type: "payment result",
		success: true,
		inputUTXOs: transactionData.inputUTXOs,
		changeUTXOs,
	};

	const ledgerUpdatePromises = [];

	ledgerUpdatePromises.push(
		new Promise(async (resolve, reject) => {
			await PeerConnection.sendConnection(senderId, transactionResult);

			unresolvedPromises.set(senderId, { resolve, reject });
		})
	);

	for (let outputUTXO of outputUTXOs) {
		const recepientId = outputUTXO.publicKey;

		if (recepientId !== senderId) {
			await PeerConnection.connectPeer(recepientId);

			ledgerUpdatePromises.push(
				new Promise(async (resolve) => {
					await PeerConnection.sendConnection(recepientId, {
						type: "get payment",
						receivedUTXOs: [outputUTXO],
					});

					PeerConnection.onConnectionReceiveData(
						recepientId,
						(recipientResponse) => {
							if (
								recipientResponse.type === "payment updated" &&
								recipientResponse.success
							) {
								resolve();
							}
						}
					);
				})
			);
		}
	}

	await Promise.all(ledgerUpdatePromises);
	console.log("All the recipients have updated their ledger");
	console.log("Transaction complete!");
};
