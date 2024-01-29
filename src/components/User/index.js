import React, { useEffect } from "react";
import PeerConnection from "../../peer";
import {
	handleTransaction,
	handleIncomingConnection,
	createSignature,
} from "./User";
import nodeIds from "../../Ids";

import "./styles.css";

const userPublicKey = nodeIds["sender"].id;
const recipientPublicKey = nodeIds["recipient"].id;

var transactionData = {
	type: "payment",
	inputUtxos: [
		{
			transactionId: "transactionId1",
			outputIndex: 0,
			amount: 15,
			publicKey: userPublicKey,
		},
	],
	outputUtxos: [
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

transactionData.digitalSignatures = transactionData.inputUtxos.map((utxo) =>
	createSignature(utxo, "5")
);

const User = () => {
	useEffect(() => {
		const initializeUser = async () => {
			try {
				await PeerConnection.startPeerSession(userPublicKey);
				await handleTransaction(transactionData);
				PeerConnection.onIncomingConnection(handleIncomingConnection);
			} catch (error) {
				console.error(
					"Initialization or transaction handling failed:",
					error
				);
			}
		};

		initializeUser();
	}, []);

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
