import React, { useEffect } from "react";
import PeerConnection from "../../peer";
import { handleTransaction, handleIncomingConnection } from "./User";

import "./styles.css";

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
