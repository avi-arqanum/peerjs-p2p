import { handleUsersLedgerUpdate } from "./User";

import {
	handleValidatorsValidation,
	handleValidatorsLedgerUpdate,
} from "./Validator";

import {
	handleCurrencyShardValidation,
	handleCurrencyShardsLedgerUpdate,
} from "./CurrencyShard";

import { compact } from "./CurrencyShard";
import PeerConnection from "../../peer";
import nodeIds from "../../Ids";

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

export const handleValidation = async (
	senderId,
	transactionId,
	transactionData
) => {
	var validationPromises = [];

	validationPromises.push(
		handleValidatorsValidation(transactionData, transactionId)
	);

	validationPromises.push(
		handleCurrencyShardValidation(transactionData, transactionId)
	);

	await Promise.all(validationPromises);

	const { totalVotes, valid } = veto.getVotes(transactionId);
	console.log("veto votes result", totalVotes, valid);

	if (totalVotes !== 2) {
		throw new Error("Something went wrong!");
	}

	const isValid = valid === 2;

	if (isValid) {
		await handleValidTransaction(senderId, transactionId, transactionData);
	} else {
		await handleInvalidTransaction(senderId, transactionId);
	}
};

export const handleValidTransaction = async (
	senderId,
	transactionId,
	transactionData
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

const transactionCoordinatorId = nodeIds["transaction coordinator"].id;

const handleInvalidTransaction = async (senderId, transactionId) => {
	await PeerConnection.sendConnection(senderId, {
		type: "payment result",
		success: false,
	});

	await PeerConnection.sendConnection(transactionCoordinatorId, {
		type: "transaction invalidated",
		...compact.getTransaction(transactionId),
	});
};
