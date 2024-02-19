import PeerConnection from "../../peer";
import { handleValidation } from "./TransactionManager";
import calculateTransactionId from "./transactionId";

const validFormat = (transaction) => {
	return true;

	if (
		transaction.inputUtxos.length < 1 ||
		transaction.outputUtxos.length < 1
	) {
		return false;
	}

	if (
		transaction.digitalSignatures.length !== transaction.inputUtxos.length
	) {
		return false;
	}

	let totalInputValue = 0;
	for (let input of transaction.inputUtxos) {
		totalInputValue += input.amount;
	}

	let totalOutputValue = 0;
	for (let output of transaction.outputUtxos) {
		totalOutputValue += output.amount;
	}

	if (totalInputValue !== totalOutputValue) {
		return false;
	}

	return true;
};

const unresolvedPromises = new Map();

export const handleUserConnection = (connection) => {
	const senderId = connection.peer;

	PeerConnection.onConnectionReceiveData(senderId, async (data) => {
		switch (data.type) {
			case "payment":
				{
					if (!validFormat(data)) {
						await PeerConnection.sendConnection(senderId, {
							type: "payment result",
							success: false,
							// add some localId for user identifying a transaction
						});
						return;
					}

					console.log(
						"format validated & transaction validation has begun"
					);
					const transactionId = calculateTransactionId(data);

					await handleValidation(senderId, transactionId, data);
				}
				break;

			case "payment updated":
				if (unresolvedPromises.has(senderId)) {
					const promiseHandlers = unresolvedPromises.get(senderId);

					if (data.success) {
						promiseHandlers.resolve();
						console.log("Sender ledger updated");
					} else {
						promiseHandlers.reject();
						console.log("Couldn't update sender ledger");
					}

					unresolvedPromises.delete(senderId);
				}
				break;
		}
	});
};

export const handleUsersLedgerUpdate = async (
	senderId,
	transactionData,
	transactionId
) => {
	const outputUtxos = transactionData.outputUtxos.map((output, index) => ({
		...output,
		transactionId: transactionId,
		outputIndex: index,
	}));

	const transactionResult = {
		type: "payment result",
		success: true,
		transactionId,
		inputUtxos: transactionData.inputUtxos,
		outputUtxos: outputUtxos.filter(
			(outputUtxo) => outputUtxo.publicKey === senderId
		),
	};

	const ledgerUpdatePromises = [];

	ledgerUpdatePromises.push(
		new Promise(async (resolve, reject) => {
			await PeerConnection.sendConnection(senderId, transactionResult);

			unresolvedPromises.set(senderId, { resolve, reject });
		})
	);

	for (let outputUtxo of outputUtxos) {
		const recepientId = outputUtxo.publicKey;

		if (recepientId !== senderId) {
			await PeerConnection.connectPeer(recepientId);

			ledgerUpdatePromises.push(
				new Promise(async (resolve) => {
					await PeerConnection.sendConnection(recepientId, {
						type: "get payment",
						receivedUTXOs: [outputUtxo],
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
};
