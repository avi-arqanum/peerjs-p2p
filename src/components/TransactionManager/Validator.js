import PeerConnection from "../../peer";
import { updateVetoVotes } from "./TransactionManager";

const validatorIds = [
	"4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
];

export const handleValidatorsValidation = async (
	transactionData,
	transactionId
) => {
	const votes = {
		valid: 0,
		invalid: 0,
	};

	const validationPromises = [];

	for (let validatorId of validatorIds) {
		validationPromises.push(
			new Promise(async (resolve) => {
				await PeerConnection.connectPeer(validatorId);

				await PeerConnection.sendConnection(
					validatorId,
					transactionData
				);

				PeerConnection.onConnectionReceiveData(
					validatorId,
					(validationData) => {
						if (validationData.success) {
							votes.valid += 1;
						} else {
							votes.invalid += 1;
						}

						resolve();
					}
				);
			})
		);
	}

	await Promise.all(validationPromises);
	console.log("All the validators have responded");

	const validationThreshold = Math.ceil(validatorIds.length * 0.66666667);
	const isValid = votes.valid >= validationThreshold;

	console.log(
		"ArqValidators have reached on consensus that transaction is",
		isValid ? "valid" : "invalid"
	);

	updateVetoVotes(transactionId, isValid);
};

export const handleValidatorsLedgerUpdate = async (
	transactionId,
	transactionData
) => {
	const ledgerUpdatePromises = [];

	for (let validatorId of validatorIds) {
		ledgerUpdatePromises.push(
			new Promise(async (resolve) => {
				await PeerConnection.sendConnection(validatorId, {
					type: "ledger update",
					transactionId,
					transactionData,
				});

				PeerConnection.onConnectionReceiveData(validatorId, (data) => {
					if (
						data.type === "ledger updated" &&
						data.success === true
					) {
						resolve();
					}
				});
			})
		);
	}

	await Promise.all(ledgerUpdatePromises);
	console.log("All the validators have updated their ledger");
};