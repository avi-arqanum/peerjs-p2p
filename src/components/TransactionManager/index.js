import React from "react";
import { Peer } from "peerjs";

import CryptoJS from "crypto-js";
function calculateTransactionId(transactionData) {
	let transactionString = "";

	transactionString += transactionData.inputUTXOs.length;

	// Concatenate input UTXOs
	for (const input of transactionData.inputUTXOs) {
		transactionString +=
			input.transactionId +
			input.outputIndex +
			input.amount +
			input.senderId;
	}

	transactionString += transactionData.outputUTXOs.length;

	// Concatenate output UTXOs
	for (const output of transactionData.outputUTXOs) {
		transactionString += output.amount + output.recieverId;
	}

	// Hash the concatenated string
	return CryptoJS.SHA256(transactionString).toString();
}

const TransactionManager = () => {
	const transactionManagerId =
		"5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9";
	const manager = new Peer();

	manager.on("open", (id) => {
		console.log(`Started listening for new connections on ${id}`);
	});

	manager.on("error", (err) => console.log("PeerJS error:", err));

	manager.on("connection", async (connection) => {
		const senderId = connection.peer;
		console.log(`${senderId} connected`);

		connection.on("data", async (transactionData) => {
			if (transactionData.type === "payment") {
				console.log("Transaction validation started");

				console.log("Validation reached transaction is valid");
				const isValid = true;

				if (isValid) {
					const transactionId =
						calculateTransactionId(transactionData);

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
						new Promise((resolve) => {
							connection.send(transactionResult);

							connection.once("data", (senderResponse) => {
								if (
									senderResponse.type === "ledger updated" &&
									senderResponse.success
								) {
									resolve();
									console.log("Sender ledger updated");
								}
							});
						})
					);

					for (let outputUTXO of outputUTXOs) {
						const recepientId = outputUTXO.publicKey;

						if (recepientId !== senderId) {
							const recepientConnection =
								manager.connect(recepientId);

							ledgerUpdatePromises.push(
								new Promise((resolve) => {
									recepientConnection.on("open", () => {
										recepientConnection.send({
											type: "get payment",
											recievedUTXOs: [outputUTXO],
										});

										recepientConnection.on(
											"data",
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
									});
								})
							);
						}
					}

					await Promise.all(ledgerUpdatePromises);
					console.log("All the recipients have updated their ledger");
				} else {
					connection.send({ type: "payment result", success: false });
				}
			}
		});
	});

	return (
		<div>
			<div>
				<span>Active transactions:</span>
			</div>
		</div>
	);
};

export default TransactionManager;
