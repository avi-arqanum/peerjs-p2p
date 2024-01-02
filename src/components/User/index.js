import React from "react";
import { Peer } from "peerjs";

import "./styles.css";

const User = () => {
	const transactionManagerId =
		"5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9";

	// peerId would be same as users public key
	// for seed 1
	const userPublicKey =
		"6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b";

	// for seed 2
	const recipientPublicKey =
		"d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35";

	const user = new Peer(userPublicKey);

	// sender & reciever Ids are public keys
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
		// for each UTXO
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

	// send transaction to TM
	const connection = user.connect(transactionManagerId);
	connection.on("open", () => {
		console.log("Connection with transaction manager established");
		connection.send(transactionData);
		console.log("Transaction data sent");

		connection.on("data", (transactionResult) => {
			if (transactionResult.success) {
				console.log("Transaction is valid");
				// update merkle patricia trie (delete input UTXOs & add change UTXOs)
				setTimeout(() => {
					connection.send({ type: "payment updated", success: true });
					console.log("Payment updated sent to TM");
				}, 1000);
			} else {
				console.log("Transaction manager disapproved transaction");
			}
		});
	});

	// receive payment through TM
	user.on("connection", (connection) => {
		const senderId = connection.peer;

		connection.on("data", (transactionData) => {
			if (senderId === transactionManagerId) {
				console.log("Transaction manager established connection");
				// update merkle patricia trie
				setTimeout(() => {
					connection.send({ type: "payment updated", success: true });
					console.log("payment received & ledger updated");
				}, 1000);
			}
		});
	});

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

				<div class="button_container">
					<button type="submit" className="btn btn-primary">
						Send
					</button>
				</div>
			</form>
		</div>
	);
};

export default User;
