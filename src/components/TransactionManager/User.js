import PeerConnection from "../../peer";
import { handleValidation } from "./TransactionManager";
import { handleValidTransaction } from "./TransactionManager";
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

const invalidateTransaction = async (senderId, transactionId) => {
	await PeerConnection.sendConnection(senderId, {
		type: "payment result",
		transactionId,
		success: false,
	});
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
						await invalidateTransaction(senderId);
						return;
					}

					console.log("Transaction validation has begun");
					const transactionId = calculateTransactionId(data);

					const isValid = await handleValidation(data, transactionId);

					if (isValid) {
						await handleValidTransaction(
							data,
							transactionId,
							senderId
						);
					} else {
						await invalidateTransaction(senderId, transactionId);
					}
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
