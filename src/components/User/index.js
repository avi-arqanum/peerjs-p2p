import React, { useEffect, useState } from "react";
import { Peer } from "peerjs";

import "./styles.css";

const transactionManagerId =
	"5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9";

const userPublicKey =
	"6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b";

const recipientPublicKey =
	"d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35";

const transactionData = {
	type: "payment",
	inputUTXOs: [
		{
			transactionId: "some transactionId",
			outputIndex: 0,
			amount: 15,
			publicKey: userPublicKey,
		},
	],
	digitalSignatures: ["some signature"],
	outputUTXOs: [
		{
			amount: 10,
			publicKey: recipientPublicKey,
		},
		{
			amount: 5,
			publicKey: userPublicKey,
		},
	],
};

const User = () => {
	const [user, setUser] = useState();
	const [connection, setConnection] = useState();

	useEffect(() => {
		setUser(new Peer(userPublicKey));
	}, []);

	useEffect(() => {
		if (user) {
			console.log("user started with peerId:", user.id);

			handleTransaction(transactionData);
			user.on("connection", handleIncomingConnection);
		}
	}, [user]);

	const handleTransaction = (transactionData) => {
		try {
			const newConnection = user.connect(transactionManagerId);

			setConnection(newConnection);

			newConnection.on("open", () => {
				console.log("Connection with transaction manager established");

				newConnection.send(transactionData);
				console.log("Transaction is sent for validation");

				newConnection.on("data", handleTransactionResult);
			});
		} catch (error) {
			console.log("Connection error:", error);
		}
	};

	const handleTransactionResult = (transactionResult) => {
		if (transactionResult.success) {
			console.log("Transaction is valid!");

			setTimeout(() => {
				connection.send({ type: "payment updated", success: true });
				console.log("Payment update sent to transaction manager");
			}, 1000);
		} else {
			console.log("Transaction manager disapproved the transaction");
		}
	};

	const handleIncomingConnection = (incomingConnection) => {
		const senderId = incomingConnection.peer;
		console.log(`Received connection from ${senderId}`);

		incomingConnection.on("data", (transactionData) => {
			console.log("Received transaction data:", transactionData);

			if (senderId === transactionManagerId) {
				console.log("Transaction manager has established connection");

				// update merkle patricia trie

				setTimeout(() => {
					incomingConnection.send({
						type: "payment updated",
						success: true,
					});
					console.log("Payment received & ledger updated");
				}, 1000);
			}
		});
	};

	return (
		<div className="form_container">
			<form action="" className="form-group form">
				<label className="form-label">Reciever public key:</label>
				<input
					type="text"
					placeholder="64 digit hexadecimal string"
					className="form-control mb-2"
				/>

				<label className="form-label">Payment amount:</label>
				<input
					type="number"
					placeholder="200"
					className="form-control mb-4"
				/>

				<div className="button_container">
					<button type="submit" className="btn btn-primary">
						Send
					</button>
				</div>
			</form>
		</div>
	);
};

export default User;
