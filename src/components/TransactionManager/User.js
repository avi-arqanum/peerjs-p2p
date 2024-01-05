import PeerConnection from "../../peer";
import { handleValidation } from "./TransactionManager";
import calculateTransactionId from "./transactionId";

const validFormat = (transaction) => {
	if (
		transaction.inputUTXOs.length < 1 ||
		transaction.outputUTXOs.length < 1
	) {
		return false;
	}

	if (
		transaction.digitalSignatures.length !== transaction.inputUTXOs.length
	) {
		return false;
	}

	let totalInputValue = 0;
	for (let input of transaction.inputUTXOs) {
		totalInputValue += input.amount;
	}

	let totalOutputValue = 0;
	for (let output of transaction.outputUTXOs) {
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
	console.log(`Transaction manager connected to: ${senderId}`);

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

					console.log("Transaction validation has begun");
					const transactionId = calculateTransactionId(data);

					await handleValidation(data, transactionId);
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
