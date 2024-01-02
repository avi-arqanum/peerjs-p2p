import React, { useEffect, useState } from "react";
import { Peer } from "peerjs";

import calculateTransactionId from "./transactionId";

const transactionManagerId =
	"5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9";

const TransactionManager = () => {
	const [manager, setManager] = useState();

	useEffect(() => {
		setManager(new Peer(transactionManagerId));
	}, []);

	useEffect(() => {
		if (manager) {
			console.log(
				"manager started listening for transactions on peerId:",
				manager.id
			);

			manager.on("connection", handleUserConnection);
		}
	}, [manager]);

	const handleUserConnection = (connection) => {
		const senderId = connection.peer;
		console.log(`Transaction manager connected to: ${senderId}`);

		connection.on("data", async (userData) => {
			if (userData.type === "payment") {
				console.log("Transaction validation has begun");

				const isValid = true;

				if (isValid) {
					await handleValidTransaction(
						userData,
						senderId,
						connection
					);
				} else {
					connection.send({ type: "payment result", success: false });
				}
			}
		});
	};

	const handleValidTransaction = async (
		transactionData,
		senderId,
		connection
	) => {
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
			new Promise((resolve) => {
				connection.send(transactionResult);

				connection.once("data", (senderResponse) => {
					if (
						senderResponse.type === "payment updated" &&
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
				const recepientConnection = manager.connect(recepientId);

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
	};
};

export default TransactionManager;
