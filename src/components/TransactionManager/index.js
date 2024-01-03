import { useEffect } from "react";
import PeerConnection from "../../peer";

import calculateTransactionId from "./transactionId";

const transactionManagerId =
	"5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9";

const validatorIds = [
	"4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
];

const TransactionManager = () => {
	const unresolvedPromises = new Map();

	useEffect(() => {
		const initializeConnection = async () => {
			try {
				await PeerConnection.startPeerSession(transactionManagerId);
				PeerConnection.onIncomingConnection(handleUserConnection);
			} catch (error) {
				console.log("Error initializing transaction manager", error);
			}
		};

		initializeConnection();
	}, []);

	const handleUserConnection = (connection) => {
		const senderId = connection.peer;
		console.log(`Transaction manager connected to: ${senderId}`);

		PeerConnection.onConnectionReceiveData(senderId, async (userData) => {
			switch (userData.type) {
				case "payment":
					{
						console.log("Transaction validation has begun");

						const isValid = handleValidation(userData);
						console.log(
							"Validators have reached on consensus that transaction is",
							isValid ? "valid" : "invalid"
						);

						if (isValid) {
							await handleValidTransaction(userData, senderId);
						} else {
							await PeerConnection.sendConnection(senderId, {
								type: "payment result",
								success: false,
							});
						}
					}
					break;

				case "payment updated":
					if (unresolvedPromises.has(senderId)) {
						const promiseHandlers =
							unresolvedPromises.get(senderId);

						if (userData.success) {
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

	const handleValidation = async (transactionData) => {
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

		return votes.valid >= validationThreshold;
	};

	const handleValidTransaction = async (transactionData, senderId) => {
		const transactionId = calculateTransactionId(transactionData);

		const outputUTXOs = transactionData.outputUTXOs.map(
			(output, index) => ({
				...output,
				transactionId: transactionId,
				outputIndex: index,
			})
		);

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
				await PeerConnection.sendConnection(
					senderId,
					transactionResult
				);

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
									recipientResponse.type ===
										"payment updated" &&
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
};

export default TransactionManager;
